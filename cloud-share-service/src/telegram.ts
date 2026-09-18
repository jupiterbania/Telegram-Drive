/**
 * Telegram media resolution and streaming bridge for Cloud Share.
 * Resolves public Telegram channel posts into streamable direct media links.
 */

export interface ResolvedTelegramMedia {
  directMediaUrl: string | null;
  telegramPostUrl: string;
  telegramEmbedUrl: string;
  detectedType: 'video' | 'audio' | 'image' | 'document' | 'unknown';
  previewImageUrl: string | null;
}

export async function resolveTelegramMedia(
  channelUsername: string,
  messageId: number
): Promise<ResolvedTelegramMedia> {
  const cleanUsername = channelUsername.replace(/^@/, '');
  const telegramPostUrl = `https://t.me/${cleanUsername}/${messageId}`;
  const telegramEmbedUrl = `https://t.me/${cleanUsername}/${messageId}?embed=1`;

  let directMediaUrl: string | null = null;
  let detectedType: ResolvedTelegramMedia['detectedType'] = 'unknown';
  let previewImageUrl: string | null = null;

  try {
    const res = await fetch(telegramEmbedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (res.ok) {
      const html = await res.text();

      // 1. Check for video source
      const videoMatch = html.match(/<video[^>]+src=["'](https:[^"']+)["']/i);
      if (videoMatch && videoMatch[1]) {
        directMediaUrl = videoMatch[1].replace(/&amp;/g, '&');
        detectedType = 'video';
      }

      // 2. Check for photo background image
      const photoMatch = html.match(
        /tgme_widget_message_photo_wrap[^>]+style=["'][^"']*background-image:\s*url\(["']?(https:[^"')]+)["']?\)/i
      );
      if (photoMatch && photoMatch[1]) {
        previewImageUrl = photoMatch[1].replace(/&amp;/g, '&');
        if (!directMediaUrl) {
          directMediaUrl = previewImageUrl;
          detectedType = 'image';
        }
      }

      // 3. Check for document wrap
      const docWrapMatch = html.match(
        /class=["']tgme_widget_message_document_wrap[^"']*["'][^>]*href=["'](https:[^"']+)["']/i
      );
      if (docWrapMatch && docWrapMatch[1] && !directMediaUrl) {
        directMediaUrl = docWrapMatch[1].replace(/&amp;/g, '&');
        detectedType = 'document';
      }

      // Check for preview thumb on documents / video
      const thumbMatch = html.match(
        /tgme_widget_message_document_icon[^>]+style=["'][^"']*background-image:\s*url\(["']?(https:[^"')]+)["']?\)/i
      );
      if (thumbMatch && thumbMatch[1] && !previewImageUrl) {
        previewImageUrl = thumbMatch[1].replace(/&amp;/g, '&');
      }
    }
  } catch (err) {
    console.error('Failed to parse Telegram embed:', err);
  }

  return {
    directMediaUrl,
    telegramPostUrl,
    telegramEmbedUrl,
    detectedType,
    previewImageUrl,
  };
}

/**
 * Proxy stream from Telegram CDN with support for HTTP Range requests
 * (crucial for video scrubbing and resumable downloads).
 */
export async function proxyTelegramStream(
  url: string,
  fileName: string,
  requestHeaders: Headers,
  asAttachment = true
): Promise<Response> {
  const headers = new Headers();
  const range = requestHeaders.get('Range');
  if (range) {
    headers.set('Range', range);
  }
  headers.set(
    'User-Agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  const upstream = await fetch(url, { headers });

  const responseHeaders = new Headers(upstream.headers);
  const cleanName = fileName.replace(/["\r\n]/g, '');
  const disposition = asAttachment ? 'attachment' : 'inline';
  responseHeaders.set(
    'Content-Disposition',
    `${disposition}; filename="${encodeURIComponent(cleanName)}"`
  );
  responseHeaders.set('Access-Control-Allow-Origin', '*');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
