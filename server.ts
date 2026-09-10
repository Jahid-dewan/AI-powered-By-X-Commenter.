import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { fetchTweetData } from './server/tweetService.ts';
import { processCommentGeneration } from './server/commentService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    const hasApiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
    res.json({ status: 'ok', hasApiKey });
  });

  // Extract / fetch individual tweet info
  app.post('/api/fetch-tweet-info', async (req, res) => {
    try {
      const { url, tweetId } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }
      const data = await fetchTweetData(url, tweetId || '');
      return res.json({ data });
    } catch (error) {
      console.error('Error fetching tweet info:', error);
      return res.status(500).json({ error: 'Failed to fetch tweet details' });
    }
  });

  // Analyze single post and generate comments
  app.post('/api/generate-comment', async (req, res) => {
    try {
      const {
        post,
        tone = 'engaging',
        userPersona = '',
        language = 'English',
        previousComments = [],
        postIndex = 0,
      } = req.body;

      if (!post || !post.url) {
        return res.status(400).json({ error: 'Post data with URL is required' });
      }

      const result = await processCommentGeneration({
        post,
        tone,
        userPersona,
        language,
        previousComments,
        postIndex,
      });

      return res.json({
        success: true,
        data: result,
        hasApiKey: result.hasApiKey,
      });
    } catch (error: any) {
      console.error('Handled error in /api/generate-comment:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate comment',
      });
    }
  });

  // Batch analyze multiple posts
  app.post('/api/batch-generate', async (req, res) => {
    try {
      const { posts, tone = 'engaging', userPersona = '', language = 'English' } = req.body;
      if (!Array.isArray(posts) || posts.length === 0) {
        return res.status(400).json({ error: 'Array of posts is required' });
      }

      const targetPosts = posts.slice(0, 20);
      const results = [];
      const previousComments: string[] = [];

      for (let i = 0; i < targetPosts.length; i++) {
        const p = targetPosts[i];
        const resItem = await processCommentGeneration({
          post: p,
          tone,
          userPersona,
          language,
          previousComments,
          postIndex: i,
        });
        if (resItem.primaryComment) {
          previousComments.push(resItem.primaryComment);
        }
        results.push(resItem);
      }

      return res.json({ success: true, results });
    } catch (error: any) {
      console.error('Batch generation failed:', error);
      return res.status(500).json({ error: error.message || 'Batch generation failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
