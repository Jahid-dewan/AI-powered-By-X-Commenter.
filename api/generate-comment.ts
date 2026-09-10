import { processCommentGeneration } from '../server/commentService.ts';

export default async function handler(req: any, res: any) {
  // Setup CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { post, tone, userPersona, language, previousComments, postIndex } = body;

    if (!post || !post.url) {
      return res.status(400).json({ error: 'Post object with a URL is required' });
    }

    const result = await processCommentGeneration({
      post,
      tone,
      userPersona,
      language,
      previousComments,
      postIndex,
    });

    return res.status(200).json({
      success: true,
      data: result,
      hasApiKey: result.hasApiKey,
    });
  } catch (error: any) {
    console.error('Error in Vercel /api/generate-comment:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error generating comment',
    });
  }
}
