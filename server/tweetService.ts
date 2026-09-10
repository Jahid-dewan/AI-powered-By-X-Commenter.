import { GoogleGenAI, Type } from '@google/genai';
import { generateContentWithFallback } from './aiHelper.ts';

export interface TweetMetadata {
  text: string;
  authorName: string;
  authorHandle: string;
  topic?: string;
}

/**
 * Detects tweet content, author, and topic using Gemini AI
 */
export async function detectTweetWithAI(
  url: string,
  tweetId: string,
  authorUsername?: string
): Promise<TweetMetadata | null> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const cleanUrl = (url || '').split('?')[0].split('#')[0];
    const username =
      authorUsername || cleanUrl.match(/(?:twitter\.com|x\.com)\/([A-Za-z0-9_]+)/i)?.[1] || '';

    const prompt = `Analyze this Twitter / X post link:
URL: ${cleanUrl}
Tweet ID: ${tweetId || 'unknown'}
Author Handle: ${username ? `@${username}` : 'unknown'}

Task:
1. Identify the author's display name and handle.
2. If this is a known post or quote by this creator, provide the exact quote. If not in direct memory, provide a clear, accurate, concise summary of what this creator posted, claimed, or discussed in this post.
3. Identify the main topic in 1-3 words (e.g. AI Engineering, Startup Hiring, Product Design).`;

    const { responseText } = await generateContentWithFallback(ai, {
      contents: prompt,
      temperature: 0.7,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
            description: 'The quote or clear summary of the post content',
          },
          authorName: {
            type: Type.STRING,
            description: 'Full name of the author (e.g. Andrej Karpathy, Sam Altman)',
          },
          authorHandle: {
            type: Type.STRING,
            description: 'Handle with @ symbol (e.g. @karpathy)',
          },
          topic: {
            type: Type.STRING,
            description: 'Core subject matter in 1-3 words',
          },
        },
        required: ['text', 'authorName', 'authorHandle', 'topic'],
      },
    });

    if (responseText) {
      const parsed = JSON.parse(responseText);
      if (parsed.text) {
        return {
          text: parsed.text.trim(),
          authorName: parsed.authorName || username || '',
          authorHandle: parsed.authorHandle || (username ? `@${username}` : ''),
          topic: parsed.topic || '',
        };
      }
    }
  } catch (err) {
    console.error('AI tweet detection fallback error:', err);
  }
  return null;
}

/**
 * Fetches tweet text and author metadata via multiple resilient methods:
 * 1. Official Twitter oEmbed API
 * 2. Twimg Syndication API
 * 3. FxTwitter API
 * 4. Gemini AI detection fallback (when web scraping is blocked)
 */
export async function fetchTweetData(
  url: string,
  tweetId: string,
  authorUsername?: string
): Promise<TweetMetadata | null> {
  const cleanUrl = (url || '').split('?')[0].split('#')[0];
  const id = tweetId || cleanUrl.match(/status(?:es)?\/(\d+)/i)?.[1] || '';
  const username =
    authorUsername || cleanUrl.match(/(?:twitter\.com|x\.com)\/([A-Za-z0-9_]+)/i)?.[1] || '';

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

  // 4. Try Gemini AI detection fallback when web scraping is blocked
  if (cleanUrl) {
    const aiResult = await detectTweetWithAI(cleanUrl, id, username);
    if (aiResult) {
      return aiResult;
    }
  }

  return null;
}
