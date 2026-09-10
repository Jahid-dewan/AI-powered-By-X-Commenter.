import { fetchTweetData } from '../server/tweetService.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { url, tweetId } = body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const data = await fetchTweetData(url, tweetId || '');
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Error in Vercel /api/fetch-tweet-info:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch tweet details' });
  }
}
