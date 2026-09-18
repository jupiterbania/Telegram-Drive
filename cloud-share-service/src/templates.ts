/**
 * Premium dark-mode HTML templates for Telegram Drive Cloud Share.
 * Self-contained Vanilla HTML/CSS with zero external runtime dependencies.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const BASE_STYLES = `
  :root {
    --bg-dark: #0a0d14;
    --bg-card: rgba(22, 27, 34, 0.85);
    --border-card: rgba(255, 255, 255, 0.08);
    --text-primary: #f0f6fc;
    --text-secondary: #8b949e;
    --accent: #2ea043;
    --accent-hover: #3fb950;
    --telegram-blue: #2aabee;
    --telegram-hover: #229ed9;
    --danger: #f85149;
    --danger-bg: rgba(248, 81, 73, 0.15);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: radial-gradient(circle at 50% 20%, #17202f 0%, var(--bg-dark) 70%);
    color: var(--text-primary);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border-card);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-radius: 16px;
    padding: 2rem;
    width: 100%;
    max-width: 440px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.1);
    animation: fadeIn 0.3s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .header {
    text-align: center;
    margin-bottom: 1.5rem;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: rgba(42, 171, 238, 0.12);
    color: var(--telegram-blue);
    border: 1px solid rgba(42, 171, 238, 0.25);
    margin-bottom: 0.75rem;
  }
  .file-icon-box {
    width: 64px;
    height: 64px;
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(42, 171, 238, 0.2), rgba(46, 160, 67, 0.2));
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1rem;
  }
  .file-title {
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--text-primary);
    word-break: break-word;
    margin-bottom: 0.35rem;
  }
  .file-meta {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }
  .input-group {
    margin-bottom: 1.25rem;
  }
  .input-label {
    display: block;
    font-size: 0.85rem;
    font-weight: 500;
    margin-bottom: 0.4rem;
    color: var(--text-primary);
  }
  .input-box {
    width: 100%;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    background: rgba(13, 17, 23, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: var(--text-primary);
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .input-box:focus {
    border-color: var(--telegram-blue);
    box-shadow: 0 0 0 3px rgba(42, 171, 238, 0.25);
  }
  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.85rem 1.25rem;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    border: none;
    text-decoration: none;
    transition: background 0.2s, transform 0.1s;
  }
  .btn:active { transform: scale(0.98); }
  .btn-primary {
    background: var(--telegram-blue);
    color: #ffffff;
  }
  .btn-primary:hover { background: var(--telegram-hover); }
  .btn-success {
    background: var(--accent);
    color: #ffffff;
  }
  .btn-success:hover { background: var(--accent-hover); }
  .alert-error {
    background: var(--danger-bg);
    border: 1px solid rgba(248, 81, 73, 0.4);
    color: var(--danger);
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    margin-bottom: 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    animation: shake 0.3s ease-in-out;
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }
  .footer {
    text-align: center;
    margin-top: 1.5rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }
  .footer a {
    color: var(--telegram-blue);
    text-decoration: none;
  }
`;

export function renderPasswordPage(data: {
  fileName: string;
  fileSize: number;
  token: string;
  expiresAt: number | null;
  error?: string;
}): string {
  const expiresText = data.expiresAt
    ? `Expires ${new Date(data.expiresAt * 1000).toLocaleString()}`
    : 'No Expiration';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Protected File | Telegram Drive</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        Protected Cloud Link
      </div>
      <div class="file-icon-box">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2AABEE" stroke-width="2">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
          <polyline points="13 2 13 9 20 9"></polyline>
        </svg>
      </div>
      <h1 class="file-title">${escapeHtml(data.fileName)}</h1>
      <p class="file-meta">${formatBytes(data.fileSize)} · ${expiresText}</p>
    </div>

    ${data.error ? `<div class="alert-error">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      ${escapeHtml(data.error)}
    </div>` : ''}

    <form method="POST" action="/s/${escapeHtml(data.token)}/verify">
      <div class="input-group">
        <label class="input-label" for="password">Enter Access Password</label>
        <input 
          id="password" 
          name="password" 
          type="password" 
          class="input-box" 
          placeholder="Enter the password to unlock" 
          required 
          autofocus 
        />
      </div>
      <button type="submit" class="btn btn-primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 11 12 14 22 4"></polyline>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </svg>
        Unlock & Download
      </button>
    </form>
    <div class="footer">
      Shared securely via <strong>Telegram Drive</strong>
    </div>
  </div>
</body>
</html>`;
}

export function renderDownloadPage(data: {
  fileName: string;
  fileSize: number;
  token: string;
  directMediaUrl?: string | null;
  telegramPostUrl: string;
  mediaType: string;
  downloadCount: number;
}): string {
  const isVideo = data.mediaType === 'video' || data.fileName.match(/\.(mp4|webm|mov|mkv)$/i);
  const isImage = data.mediaType === 'image' || data.fileName.match(/\.(jpg|jpeg|png|webp|gif)$/i);
  const isAudio = data.mediaType === 'audio' || data.fileName.match(/\.(mp3|wav|ogg|m4a|flac)$/i);

  let previewHtml = '';
  if (data.directMediaUrl) {
    if (isVideo) {
      previewHtml = `<div style="margin-bottom: 1.5rem; border-radius: 12px; overflow: hidden; background: #000; border: 1px solid rgba(255,255,255,0.1);">
        <video controls style="width: 100%; max-height: 280px; display: block;" preload="metadata">
          <source src="/s/${escapeHtml(data.token)}/stream" type="video/mp4">
          Your browser does not support video playback.
        </video>
      </div>`;
    } else if (isImage) {
      previewHtml = `<div style="margin-bottom: 1.5rem; border-radius: 12px; overflow: hidden; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
        <img src="/s/${escapeHtml(data.token)}/stream" alt="Preview" style="max-width: 100%; max-height: 260px; object-fit: contain;">
      </div>`;
    } else if (isAudio) {
      previewHtml = `<div style="margin-bottom: 1.5rem;">
        <audio controls style="width: 100%;">
          <source src="/s/${escapeHtml(data.token)}/stream">
        </audio>
      </div>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Download ${escapeHtml(data.fileName)} | Telegram Drive</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge" style="background: rgba(46, 160, 67, 0.15); color: var(--accent); border-color: rgba(46, 160, 67, 0.3);">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        Ready for Download
      </div>
      <div class="file-icon-box" style="background: linear-gradient(135deg, rgba(46, 160, 67, 0.2), rgba(42, 171, 238, 0.2));">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3FB950" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      </div>
      <h1 class="file-title">${escapeHtml(data.fileName)}</h1>
      <p class="file-meta">${formatBytes(data.fileSize)} · ${data.downloadCount} downloads</p>
    </div>

    ${previewHtml}

    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <a href="/s/${escapeHtml(data.token)}/download" class="btn btn-success" download="${escapeHtml(data.fileName)}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Download File (${formatBytes(data.fileSize)})
      </a>

      <a href="${escapeHtml(data.telegramPostUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="background: rgba(42, 171, 238, 0.15); color: var(--telegram-blue); border: 1px solid rgba(42, 171, 238, 0.3);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
        Open in Telegram App
      </a>
    </div>

    <div class="footer">
      Powered by <strong>Telegram Drive Cloud</strong> · 24x7 High-Speed Streaming
    </div>
  </div>
</body>
</html>`;
}

export function renderErrorPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | Telegram Drive</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="card" style="text-align: center;">
    <div class="file-icon-box" style="background: rgba(248, 81, 73, 0.15); border-color: rgba(248, 81, 73, 0.3);">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F85149" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
    </div>
    <h1 class="file-title" style="margin-bottom: 0.75rem;">${escapeHtml(title)}</h1>
    <p class="file-meta" style="margin-bottom: 1.5rem; line-height: 1.5;">${escapeHtml(message)}</p>
    <a href="/" class="btn btn-primary">Go to Home</a>
  </div>
</body>
</html>`;
}
