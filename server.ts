import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import { fetchTweetData } from './server/tweetService.ts';
import { processCommentGeneration } from './server/commentService.ts';
import { recordUserLogin, getLoginStats } from './server/db.ts';

dotenv.config();

async function startServer() {
  const app = express();

  // The application runs behind reverse proxy listening on port 3000
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    const hasApiKey = Boolean(
      process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY.trim()
    );

    res.json({
      status: 'ok',
      hasApiKey,
    });
  });

  // User login/signup & stats endpoint
  app.get('/api/users/stats', (req, res) => {
    try {
      const stats = getLoginStats();
      return res.json({ success: true, stats });
    } catch (error: any) {
      console.error('Error fetching user stats:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch user stats' });
    }
  });

  app.post('/api/users/login', (req, res) => {
    try {
      const { name } = req.body || {};
      const result = recordUserLogin(name);
      return res.json(result);
    } catch (error: any) {
      console.error('Error recording user login:', error);
      return res.status(500).json({ success: false, error: 'Failed to record login' });
    }
  });

  // Extract / fetch individual tweet info
  app.post('/api/fetch-tweet-info', async (req, res) => {
    try {
      const { url, tweetId, username } = req.body;

      if (!url) {
        return res.status(400).json({
          error: 'URL is required',
        });
      }

      const data = await fetchTweetData(
        url,
        tweetId || '',
        username || ''
      );

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Error fetching tweet info:', error);

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch tweet details',
      });
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
        return res.status(400).json({
          error: 'Post data with URL is required',
        });
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
      console.error(
        'Handled error in /api/generate-comment:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          'Failed to generate comment',
      });
    }
  });

  // Batch analyze multiple posts
  app.post('/api/batch-generate', async (req, res) => {
    try {
      const {
        posts,
        tone = 'engaging',
        userPersona = '',
        language = 'English',
      } = req.body;

      if (!Array.isArray(posts) || posts.length === 0) {
        return res.status(400).json({
          error: 'Array of posts is required',
        });
      }

      // Limit batch processing to 30 posts
      const targetPosts = posts.slice(0, 30);

      const results = [];
      const previousComments: string[] = [];

      for (let i = 0; i < targetPosts.length; i++) {
        const post = targetPosts[i];

        const result = await processCommentGeneration({
          post,
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

      return res.json({
        success: true,
        results,
      });
    } catch (error: any) {
      console.error(
        'Batch generation failed:',
        error
      );

      return res.status(500).json({
        error:
          error.message ||
          'Batch generation failed',
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Serve the production Vite build
    const distPath = path.join(
      process.cwd(),
      'dist'
    );

    app.use(express.static(distPath));

    // SPA fallback
    app.get('*', (req, res) => {
      res.sendFile(
        path.join(distPath, 'index.html')
      );
    });
  }

  // Start server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Server running on port ${PORT}`
    );
  });
}

startServer().catch((error) => {
  console.error(
    'Failed to start server:',
    error
  );

  process.exit(1);
});
