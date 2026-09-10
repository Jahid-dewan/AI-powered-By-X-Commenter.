import { TweetPostItem } from '../types';

/**
 * Extracts Twitter / X status URLs and parses metadata
 */
export function extractTwitterUrls(rawText: string, maxItems = 20): TweetPostItem[] {
  if (!rawText || !rawText.trim()) {
    return [];
  }

  // Regex to match twitter.com or x.com status links
  // Matches:
  // https://twitter.com/username/status/1234567890
  // https://x.com/username/status/1234567890
  // https://mobile.twitter.com/username/status/1234567890
  // https://x.com/i/web/status/1234567890
  const regex = /https?:\/\/(?:mobile\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?(?:([A-Za-z0-9_]+)\/status(?:es)?\/(\d+)|i\/web\/status\/(\d+))(?:\S*)?/gi;

  const results: TweetPostItem[] = [];
  const seenIds = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(rawText)) !== null) {
    const rawUrl = match[0].split('?')[0].split('#')[0]; // Clean query params for primary URL
    const username = match[1] || 'user';
    const tweetId = match[2] || match[3] || '';

    if (tweetId && !seenIds.has(tweetId)) {
      seenIds.add(tweetId);
      results.push({
        id: `tweet-${tweetId}-${Date.now()}-${results.length}`,
        url: rawUrl,
        tweetId,
        username,
        status: 'idle',
      });

      if (results.length >= maxItems) {
        break;
      }
    }
  }

  return results;
}

export const SAMPLE_TWEETS = [
  'https://x.com/ylecun/status/1899120000000000001',
  'https://x.com/sama/status/1899120000000000002',
  'https://x.com/karpathy/status/1899120000000000003',
];
