import { processCommentGeneration } from '../server/commentService.ts';

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
    const { posts, tone = 'engaging', userPersona = '', language = 'English' } = body;

    if (!Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({ error: 'Array of posts is required' });
    }

    const previousComments: string[] = [];
    const results = [];

    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];
      const result = await processCommentGeneration({
        post: p,
        tone,
        userPersona,
        language,
        previousComments,
        postIndex: i,
      });

      if (result.primaryComment) {
        previousComments.push(result.primaryComment);
      }

      results.push(result);
    }

    return res.status(200).json({ success: true, results });
  } catch (error: any) {
    console.error('Error in Vercel /api/batch-generate:', error);
    return res.status(500).json({ success: false, error: error.message || 'Batch generation failed' });
  }
}
