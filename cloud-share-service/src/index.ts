import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie, setCookie } from 'hono/cookie';
import {
  generateToken,
  hashPassword,
  verifyPassword,
  signSession,
  verifySession,
} from './crypto';
import { resolveTelegramMedia, proxyTelegramStream } from './telegram';
import {
  renderPasswordPage,
  renderDownloadPage,
  renderErrorPage,
} from './templates';

export interface Env {
  DB: D1Database;
  APP_NAME?: string;
  MAX_ATTEMPTS?: string;
  LOCKOUT_SECONDS?: string;
  SECRET_KEY?: string;
}

interface CloudShareRow {
  id: string;
  channel_username: string;
  message_id: number;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  password_hash: string | null;
  password_salt: string | null;
  expires_at: number | null;
  created_at: number;
  download_count: number;
}

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for API routes so the desktop/mobile app can create shares
app.use(
  '/api/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Health check / Landing page
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Telegram Drive Cloud Share Service</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0a0d14; color: #f0f6fc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .box { text-align: center; max-width: 480px; padding: 2rem; border-radius: 16px; background: rgba(22, 27, 34, 0.8); border: 1px solid rgba(255,255,255,0.1); }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #2aabee; }
    p { color: #8b949e; font-size: 0.95rem; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Telegram Drive Cloud Share</h1>
    <p>24x7 Serverless Share Bridge is active and ready to process requests.</p>
  </div>
</body>
</html>`);
});

// API: Create a new share record
app.post('/api/shares', async (c) => {
  try {
    const body = await c.req.json<{
      channel_username: string;
      message_id: number;
      file_name: string;
      file_size: number;
      mime_type?: string;
      password?: string;
      expiry_hours?: number | null;
    }>();

    if (!body.channel_username || !body.message_id || !body.file_name) {
      return c.json({ error: 'Missing required parameters' }, 400);
    }

    const token = generateToken(24);
    const now = Math.floor(Date.now() / 1000);
    const expiresAt =
      body.expiry_hours && body.expiry_hours > 0
        ? now + body.expiry_hours * 3600
        : null;

    let passwordHash: string | null = null;
    let passwordSalt: string | null = null;

    if (body.password && body.password.trim().length >= 4) {
      const hashed = await hashPassword(body.password.trim());
      passwordHash = hashed.hash;
      passwordSalt = hashed.salt;
    }

    await c.env.DB.prepare(
      `INSERT INTO cloud_shares (
        id, channel_username, message_id, file_name, file_size,
        mime_type, password_hash, password_salt, expires_at, created_at, download_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    )
      .bind(
        token,
        body.channel_username.replace(/^@/, ''),
        body.message_id,
        body.file_name,
        body.file_size,
        body.mime_type || null,
        passwordHash,
        passwordSalt,
        expiresAt,
        now
      )
      .run();

    const url = new URL(c.req.url);
    const shareUrl = `${url.origin}/s/${token}`;

    return c.json({
      ok: true,
      id: token,
      share_url: shareUrl,
      file_name: body.file_name,
      file_size: body.file_size,
      has_password: passwordHash !== null,
      expires_at: expiresAt,
      created_at: now,
    });
  } catch (err: any) {
    console.error('Create share error:', err);
    return c.json({ error: err.message || 'Internal error' }, 500);
  }
});

// Helper to check share authentication
async function isAuthenticated(
  c: any,
  token: string,
  secretKey: string
): Promise<boolean> {
  const cookieName = `cloud_share_${token}`;
  const sig = getCookie(c, cookieName);
  if (!sig) return false;
  return await verifySession(token, sig, secretKey);
}

// GET /s/:id - View or Password prompt
app.get('/s/:id', async (c) => {
  const token = c.req.param('id');
  const secretKey = c.env.SECRET_KEY || 'telegram-drive-secret-fallback-key-2026';

  const row = await c.env.DB.prepare(
    'SELECT * FROM cloud_shares WHERE id = ?'
  )
    .bind(token)
    .first<CloudShareRow>();

  if (!row) {
    return c.html(
      renderErrorPage('Link Not Found', 'This shared file link does not exist or has been removed.'),
      404
    );
  }

  const now = Math.floor(Date.now() / 1000);
  if (row.expires_at && row.expires_at < now) {
    return c.html(
      renderErrorPage('Link Expired', 'This shared link has expired and is no longer available.'),
      410
    );
  }

  // If password protected, check cookie authentication
  if (row.password_hash) {
    const authed = await isAuthenticated(c, token, secretKey);
    if (!authed) {
      return c.html(
        renderPasswordPage({
          fileName: row.file_name,
          fileSize: row.file_size,
          token: row.id,
          expiresAt: row.expires_at,
        })
      );
    }
  }

  // If authenticated or public, render download & preview page
  const resolved = await resolveTelegramMedia(row.channel_username, row.message_id);

  return c.html(
    renderDownloadPage({
      fileName: row.file_name,
      fileSize: row.file_size,
      token: row.id,
      directMediaUrl: resolved.directMediaUrl,
      telegramPostUrl: resolved.telegramPostUrl,
      mediaType: resolved.detectedType,
      downloadCount: row.download_count,
    })
  );
});

// POST /s/:id/verify - Submit password
app.post('/s/:id/verify', async (c) => {
  const token = c.req.param('id');
  const secretKey = c.env.SECRET_KEY || 'telegram-drive-secret-fallback-key-2026';

  const row = await c.env.DB.prepare(
    'SELECT * FROM cloud_shares WHERE id = ?'
  )
    .bind(token)
    .first<CloudShareRow>();

  if (!row) {
    return c.html(renderErrorPage('Link Not Found', 'This link does not exist.'), 404);
  }

  const now = Math.floor(Date.now() / 1000);
  if (row.expires_at && row.expires_at < now) {
    return c.html(renderErrorPage('Link Expired', 'This link has expired.'), 410);
  }

  const formData = await c.req.formData();
  const password = (formData.get('password') as string) || '';

  if (!row.password_hash || !row.password_salt) {
    // No password needed
    return c.redirect(`/s/${token}`);
  }

  const isValid = await verifyPassword(password, row.password_hash, row.password_salt);
  if (!isValid) {
    return c.html(
      renderPasswordPage({
        fileName: row.file_name,
        fileSize: row.file_size,
        token: row.id,
        expiresAt: row.expires_at,
        error: 'Incorrect password. Please verify and try again.',
      }),
      401
    );
  }

  // Password correct: sign session cookie
  const signature = await signSession(token, secretKey);
  setCookie(c, `cloud_share_${token}`, signature, {
    path: `/s/${token}`,
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 7200, // 2 hours
  });

  return c.redirect(`/s/${token}`);
});

// GET /s/:id/download - Direct file download
app.get('/s/:id/download', async (c) => {
  const token = c.req.param('id');
  const secretKey = c.env.SECRET_KEY || 'telegram-drive-secret-fallback-key-2026';

  const row = await c.env.DB.prepare(
    'SELECT * FROM cloud_shares WHERE id = ?'
  )
    .bind(token)
    .first<CloudShareRow>();

  if (!row) {
    return c.html(renderErrorPage('Link Not Found', 'This link does not exist.'), 404);
  }

  const now = Math.floor(Date.now() / 1000);
  if (row.expires_at && row.expires_at < now) {
    return c.html(renderErrorPage('Link Expired', 'This link has expired.'), 410);
  }

  if (row.password_hash) {
    const authed = await isAuthenticated(c, token, secretKey);
    if (!authed) {
      return c.redirect(`/s/${token}`);
    }
  }

  // Increment download counter
  await c.env.DB.prepare(
    'UPDATE cloud_shares SET download_count = download_count + 1 WHERE id = ?'
  )
    .bind(token)
    .run();

  const resolved = await resolveTelegramMedia(row.channel_username, row.message_id);

  if (resolved.directMediaUrl) {
    return proxyTelegramStream(
      resolved.directMediaUrl,
      row.file_name,
      c.req.raw.headers,
      true
    );
  }

  // Fallback if direct CDN link not resolvable: redirect to public post
  return c.redirect(resolved.telegramPostUrl);
});

// GET /s/:id/stream - Inline media streaming for player
app.get('/s/:id/stream', async (c) => {
  const token = c.req.param('id');
  const secretKey = c.env.SECRET_KEY || 'telegram-drive-secret-fallback-key-2026';

  const row = await c.env.DB.prepare(
    'SELECT * FROM cloud_shares WHERE id = ?'
  )
    .bind(token)
    .first<CloudShareRow>();

  if (!row) return c.text('Not found', 404);

  if (row.password_hash) {
    const authed = await isAuthenticated(c, token, secretKey);
    if (!authed) return c.text('Unauthorized', 401);
  }

  const resolved = await resolveTelegramMedia(row.channel_username, row.message_id);
  if (!resolved.directMediaUrl) {
    return c.redirect(resolved.telegramPostUrl);
  }

  return proxyTelegramStream(
    resolved.directMediaUrl,
    row.file_name,
    c.req.raw.headers,
    false
  );
});

export default app;
