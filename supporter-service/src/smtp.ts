export interface EmailAttachment {
  filename: string;
  contentType: string;
  data?: Uint8Array;
  base64?: string;
}

export interface SmtpResult {
  success: boolean;
  from: string;
  error?: string;
  logs: string[];
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<td[^>]*>/gi, '  ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function sendGmailSmtp(options: {
  user: string;
  appPassword: string;
  fromName?: string;
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}): Promise<SmtpResult> {
  const cleanPassword = options.appPassword.replace(/\s+/g, '');
  const fromAddress = options.user.trim();
  const fromName = options.fromName || 'TG Drive Pro';
  const logs: string[] = [];

  const log = (msg: string) => {
    logs.push(msg);
    console.log(`[SMTP_DEBUG] ${msg}`);
  };

  try {
    log(`Connecting to smtp.gmail.com:465 via SMTPS (TLS) for ${fromAddress}...`);

    const { connect } = (await import('cloudflare:sockets')) as {
      connect: (
        address: { hostname: string; port: number },
        options?: { secureTransport?: 'off' | 'on' | 'starttls'; allowHalfOpen?: boolean }
      ) => {
        readable: ReadableStream<Uint8Array>;
        writable: WritableStream<Uint8Array>;
        close: () => Promise<void>;
      };
    };

    const socket = connect(
      { hostname: 'smtp.gmail.com', port: 465 },
      { secureTransport: 'on', allowHalfOpen: false }
    );

    const reader = socket.readable.getReader();
    const writer = socket.writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let buffer = '';

    async function readResponse(timeoutMs = 12000): Promise<string> {
      const startTime = Date.now();
      while (true) {
        // Look for the final terminal reply line: 3 digits followed by SPACE (not hyphen -) and newline
        const match = /(?:^|\r?\n)(\d{3})\s([^\r\n]*)\r?\n/.exec(buffer);
        if (match) {
          const endIndex = match.index + match[0].length;
          const out = buffer.slice(0, endIndex);
          buffer = buffer.slice(endIndex);
          return out;
        }

        if (Date.now() - startTime > timeoutMs) {
          throw new Error(`SMTP read timeout after ${timeoutMs}ms. Buffer was: ${buffer.substring(0, 200)}`);
        }

        // Read next chunk with timeout
        const readPromise = reader.read();
        const timeoutPromise = new Promise<{ value: undefined; done: true }>((_, reject) =>
          setTimeout(() => reject(new Error('Socket read chunk timeout')), 5000)
        );

        const { value, done } = await Promise.race([readPromise, timeoutPromise]);
        if (done) break;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
        }
      }

      const out = buffer;
      buffer = '';
      return out;
    }

    async function sendCommand(cmd: string, maskInLog = false): Promise<string> {
      if (!maskInLog) {
        log(`> ${cmd}`);
      } else {
        log(`> [MASKED_CREDENTIALS]`);
      }
      await writer.write(encoder.encode(cmd + '\r\n'));
      const res = await readResponse();
      log(`< ${res.trim()}`);
      return res;
    }

    // 1. Initial Greeting banner from Gmail SMTPS server
    const greeting = await readResponse();
    log(`< Greeting: ${greeting.trim()}`);
    if (!greeting.startsWith('220')) {
      return { success: false, from: fromAddress, error: `Invalid greeting: ${greeting}`, logs };
    }

    // 2. EHLO with official domain
    const ehloRes = await sendCommand('EHLO gmail.com');
    if (!ehloRes.includes('250')) {
      return { success: false, from: fromAddress, error: `EHLO failed: ${ehloRes}`, logs };
    }

    // 3. AUTH LOGIN
    const authRes = await sendCommand('AUTH LOGIN');
    if (!authRes.startsWith('334')) {
      return { success: false, from: fromAddress, error: `AUTH LOGIN failed: ${authRes}`, logs };
    }

    // 4. Send Base64 Username
    const userB64 = btoa(fromAddress);
    const userRes = await sendCommand(userB64, true);
    if (!userRes.startsWith('334')) {
      return { success: false, from: fromAddress, error: `Username rejected: ${userRes}`, logs };
    }

    // 5. Send Base64 App Password
    const passB64 = btoa(cleanPassword);
    const passRes = await sendCommand(passB64, true);
    if (!passRes.startsWith('235')) {
      return { success: false, from: fromAddress, error: `Gmail App Password authentication failed: ${passRes}`, logs };
    }

    // 6. MAIL FROM
    const mailFromRes = await sendCommand(`MAIL FROM:<${fromAddress}>`);
    if (!mailFromRes.startsWith('250')) {
      return { success: false, from: fromAddress, error: `MAIL FROM failed: ${mailFromRes}`, logs };
    }

    // 7. RCPT TO
    const rcptRes = await sendCommand(`RCPT TO:<${options.to.trim()}>`);
    if (!rcptRes.startsWith('250')) {
      return { success: false, from: fromAddress, error: `RCPT TO failed: ${rcptRes}`, logs };
    }

    // 8. DATA
    const dataRes = await sendCommand('DATA');
    if (!dataRes.startsWith('354')) {
      return { success: false, from: fromAddress, error: `DATA command failed: ${dataRes}`, logs };
    }

    // 9. Build Standard RFC 5322 Compliant MIME Body with Anti-Spam Headers
    const subjectB64 = btoa(unescape(encodeURIComponent(options.subject)));
    const plainText = htmlToPlainText(options.html);
    const plainTextB64 = btoa(unescape(encodeURIComponent(plainText)));
    const htmlB64 = btoa(unescape(encodeURIComponent(options.html)));
    const messageId = `<tgdrv-${Date.now()}-${Math.random().toString(36).substring(2, 10)}@gmail.com>`;
    const dateStr = new Date().toUTCString();

    const altBoundary = `----=_Alt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    const altPart = [
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      '',
      `--${altBoundary}`,
      'Content-Type: text/plain; charset=UTF-8; format=flowed',
      'Content-Transfer-Encoding: base64',
      '',
      plainTextB64,
      '',
      `--${altBoundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      htmlB64,
      '',
      `--${altBoundary}--`,
    ].join('\r\n');

    let mime = '';

    if (!options.attachments || options.attachments.length === 0) {
      mime = [
        `From: "${fromName}" <${fromAddress}>`,
        `To: <${options.to.trim()}>`,
        `Reply-To: "${fromName}" <${fromAddress}>`,
        `Date: ${dateStr}`,
        `Message-ID: ${messageId}`,
        `Subject: =?UTF-8?B?${subjectB64}?=`,
        'MIME-Version: 1.0',
        'X-Mailer: TG Drive Pro Mailer (Official)',
        altPart,
        '.',
      ].join('\r\n');
    } else {
      const mixedBoundary = `----=_Mixed_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const mixedParts: string[] = [
        `From: "${fromName}" <${fromAddress}>`,
        `To: <${options.to.trim()}>`,
        `Reply-To: "${fromName}" <${fromAddress}>`,
        `Date: ${dateStr}`,
        `Message-ID: ${messageId}`,
        `Subject: =?UTF-8?B?${subjectB64}?=`,
        'MIME-Version: 1.0',
        'X-Mailer: TG Drive Pro Mailer (Official)',
        `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
        '',
        `--${mixedBoundary}`,
        altPart,
      ];

      for (const att of options.attachments) {
        const attB64 = att.base64 || (att.data ? bytesToBase64(att.data) : '');
        mixedParts.push(
          `--${mixedBoundary}`,
          `Content-Type: ${att.contentType}; name="${att.filename}"`,
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; filename="${att.filename}"`,
          '',
          attB64
        );
      }

      mixedParts.push(`--${mixedBoundary}--`, '.');
      mime = mixedParts.join('\r\n');
    }

    log(`> Sending Anti-Spam compliant MIME body (${mime.length} bytes)...`);
    const sendRes = await sendCommand(mime);
    if (!sendRes.startsWith('250')) {
      return { success: false, from: fromAddress, error: `Message body rejected: ${sendRes}`, logs };
    }

    // 10. QUIT
    await sendCommand('QUIT');
    try {
      reader.releaseLock();
      writer.releaseLock();
      await socket.close();
    } catch {
      // ignore close errors
    }

    log(`✅ Email successfully delivered to ${options.to} via Gmail SMTPS!`);
    return { success: true, from: fromAddress, logs };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`❌ SMTP Exception: ${msg}`);
    return { success: false, from: fromAddress, error: msg, logs };
  }
}
