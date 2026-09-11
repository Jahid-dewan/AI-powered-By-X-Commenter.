import { TweetPostItem } from '../types';

/**
 * Extracts Twitter / X status URLs and any accompanying post content text
 */
export function extractTwitterUrls(rawText: string, maxItems = 30): TweetPostItem[] {
  if (!rawText || !rawText.trim()) {
    return [];
  }

  // Regex to match twitter.com or x.com status links
  const regex = /https?:\/\/(?:mobile\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?(?:([A-Za-z0-9_]+)\/status(?:es)?\/(\d+)|i\/web\/status\/(\d+))(?:\S*)?/gi;

  const matches: Array<{
    cleanUrl: string;
    username: string;
    tweetId: string;
    index: number;
    length: number;
  }> = [];

  let match: RegExpExecArray | null;
  const seenIds = new Set<string>();

  while ((match = regex.exec(rawText)) !== null) {
    const cleanUrl = match[0].split('?')[0].split('#')[0];
    const username = match[1] || 'user';
    const tweetId = match[2] || match[3] || '';

    if (tweetId && !seenIds.has(tweetId)) {
      seenIds.add(tweetId);
      matches.push({
        cleanUrl,
        username,
        tweetId,
        index: match.index,
        length: match[0].length,
      });

      if (matches.length >= maxItems) {
        break;
      }
    }
  }

  const results: TweetPostItem[] = [];

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const textStart = cur.index + cur.length;
    const textEnd = i < matches.length - 1 ? matches[i + 1].index : rawText.length;
    let snippet = rawText.slice(textStart, textEnd).trim();

    // Clean leading punctuation like hyphens, colons, or quotes separating URL from text
    snippet = snippet.replace(/^[\s\-:–—|"]+/, '').replace(/"+$/, '').trim();

    results.push({
      id: `tweet-${cur.tweetId}-${Date.now()}-${i}`,
      url: cur.cleanUrl,
      tweetId: cur.tweetId,
      username: cur.username,
      authorHandle: `@${cur.username}`,
      tweetText: snippet || undefined,
      status: 'idle',
    });
  }

  return results;
}

export const SAMPLE_INPUT_TEXT = `https://x.com/karpathy/status/1626078345293238272
The hottest new programming language is English.

https://x.com/sama/status/1725732152862085368
i loved my time at openai. it was transformative for me personally, and hopefully for the world a little bit. most of all i loved working with such talented people.

https://x.com/ylecun/status/1757871239853879308
Auto-regressive LLMs are useful and have impressive capabilities, but they are not a path to human-level AI (AGI). We need world models and objective-driven AI architectures.`;
