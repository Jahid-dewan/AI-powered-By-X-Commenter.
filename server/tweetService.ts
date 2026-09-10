export interface TweetMetadata {
  text: string;
  authorName: string;
  authorHandle: string;
}

/**
 * Fetches tweet text and author metadata via multiple resilient methods:
 * 1. Official Twitter oEmbed API
 * 2. Twimg Syndication API
 * 3. FxTwitter API
 */
export async function fetchTweetData(url: string, tweetId: string): Promise<TweetMetadata | null> {
  const cleanUrl = (url || '').split('?')[0].split('#')[0];
  const id = tweetId || cleanUrl.match(/status(?:es)?\/(\d+)/i)?.[1] || '';

  // 1. Try Twitter oEmbed API
  if (cleanUrl) {
    // Both twitter.com and x.com variants
    const candidateUrls = [
      cleanUrl,
      cleanUrl.replace('x.com', 'twitter.com'),
      cleanUrl.replace('twitter.com', 'x.com'),
    ];

    for (const candidate of candidateUrls) {
      try {
        const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(candidate)}&omit_script=true`;
        const res = await fetch(oembedUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(4000),
        });

        if (res.ok) {
          const data = (await res.json()) as { html?: string; author_name?: string; author_url?: string };
          const html = data.html || '';
          const pMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
          let text = pMatch ? pMatch[1] : '';
          text = text
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();

          const authorName = data.author_name || '';
          let authorHandle = '';
          const handleMatch = html.match(/&mdash;\s*[^(@]+(?:\(@([A-Za-z0-9_]+)\))?/i);
          if (handleMatch && handleMatch[1]) {
            authorHandle = `@${handleMatch[1]}`;
          } else if (data.author_url) {
            const urlParts = data.author_url.split('/').filter(Boolean);
            authorHandle = `@${urlParts[urlParts.length - 1]}`;
          }

          if (text || authorName) {
            return { text, authorName, authorHandle };
          }
        }
      } catch {
        // Ignore and proceed to next attempt
      }
    }
  }

  // 2. Try syndication endpoint with token calculation
  if (id) {
    try {
      const token = ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
      const synUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${token}`;
      const res = await fetch(synUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        if (data && data.text) {
          return {
            text: data.text.trim(),
            authorName: data.user?.name || '',
            authorHandle: data.user?.screen_name ? `@${data.user.screen_name}` : '',
          };
        }
      }
    } catch {
      // Ignore
    }
  }

  // 3. Try fxtwitter / fixupx fallback
  if (id) {
    try {
      const fxUrl = `https://api.fxtwitter.com/status/${id}`;
      const res = await fetch(fxUrl, {
        headers: { 'User-Agent': 'TwitterBot/1.0' },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data?.tweet?.text) {
          return {
            text: data.tweet.text.trim(),
            authorName: data.tweet.author?.name || '',
            authorHandle: data.tweet.author?.screen_name ? `@${data.tweet.author.screen_name}` : '',
          };
        }
      }
    } catch {
      // Ignore
    }
  }

  return null;
}
