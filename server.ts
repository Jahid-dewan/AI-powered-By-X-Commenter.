import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { generateContentWithFallback, generateSmartFallback } from './server/aiHelper.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Google GenAI client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface TweetMetadata {
  text: string;
  authorName: string;
  authorHandle: string;
}

// Fetch tweet content via official Twitter oEmbed endpoint or fxTwitter fallback
async function fetchTweetData(url: string, tweetId: string): Promise<TweetMetadata | null> {
  // 1. Try Twitter oEmbed API
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
    const res = await fetch(oembedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(5000),
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
  } catch (err) {
    console.warn(`oEmbed fetch failed for ${url}:`, err);
  }

  // 2. Try fxtwitter API fallback
  if (tweetId) {
    try {
      const fxUrl = `https://api.fxtwitter.com/status/${tweetId}`;
      const res = await fetch(fxUrl, {
        headers: { 'User-Agent': 'TwitterPostCommentBot/1.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          tweet?: {
            text?: string;
            author?: { name?: string; screen_name?: string };
          };
        };
        if (data.tweet) {
          return {
            text: data.tweet.text || '',
            authorName: data.tweet.author?.name || '',
            authorHandle: data.tweet.author?.screen_name ? `@${data.tweet.author.screen_name}` : '',
          };
        }
      }
    } catch (err) {
      console.warn(`fxTwitter fallback failed for ${tweetId}:`, err);
    }
  }

  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasApiKey: Boolean(process.env.GEMINI_API_KEY) });
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

  // Analyze single or multiple posts and generate comments
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

      // If tweetText is missing, fetch it first
      let tweetData: TweetMetadata | null = null;
      if (post.tweetText && post.tweetText.trim()) {
        tweetData = {
          text: post.tweetText,
          authorName: post.authorName || '',
          authorHandle: post.authorHandle || '',
        };
      } else {
        tweetData = await fetchTweetData(post.url, post.tweetId);
      }

      const hasRealContent = Boolean(tweetData?.text && tweetData.text.trim());
      const postContext = hasRealContent
        ? `EXACT POST CONTENT TO ANALYZE:
"${tweetData!.text}"
Author: ${tweetData?.authorName || post.authorName || ''} (${tweetData?.authorHandle || post.authorHandle || ''})
Post URL: ${post.url}`
        : `Tweet URL: ${post.url}
Tweet ID: ${post.tweetId}
Author Handle: ${post.username || ''}`;

      const toneGuidance: Record<string, string> = {
        engaging: 'Engaging, thoughtful, and insightful with a high-value observation or unique perspective.',
        insightful: 'Deep analytical, adding a non-obvious angle, practical counter-example, or framework.',
        supportive: 'Warm, encouraging, validating the author’s work or point with authentic enthusiasm.',
        casual: 'Conversational, natural, friendly, sounding like a savvy peer on X/Twitter.',
        question: 'Curious, asking a compelling thought-provoking question that prompts the author to reply.',
        witty: 'Clever, humorous, lighthearted, witty observation while remaining respectful.',
      };

      const selectedTonePrompt = toneGuidance[tone] || toneGuidance.engaging;

      const systemPrompt = `You are an elite Twitter/X strategist and creator.
Your job is to read and analyze Twitter/X posts and generate high-impact, authentic, engaging replies that people actually want to read, upvote, and respond to.

CRITICAL TWITTER COMMENT RULES:
1. POST-SPECIFIC ANALYSIS MANDATE:
   ${hasRealContent ? '- You MUST directly read, comprehend, and respond specifically to the thoughts, claims, question, or news stated in the EXACT POST CONTENT. Never generate generic platitudes.' : '- Read the post context and craft an insightful comment or question specifically relevant to this creator and their niche.'}
2. ABSOLUTE UNIQUENESS MANDATE:
   - Every single comment across every post MUST be completely unique, fresh, and distinct.
   - NEVER repeat identical sentence starters, phrases, or comment patterns across posts.
3. ANTI-AI CLICHE MANDATE:
   - NEVER use generic AI cliches like "Great post!", "Couldn't agree more!", "This is a game changer!", "Thanks for sharing!", "Spot on!", "Love this perspective!", or "Interesting perspective!".
4. PUNCHY, HUMAN & ACCESSIBLE:
   - Speak like a real human on Twitter/X: punchy, sharp, authentic, and direct.
   - Length: Keep each comment under 260 characters (strictly fit within Twitter's 280 character limit).
   - No hashtag stuffing (at most 0-1 natural hashtag if absolutely essential).
5. Target Language: ${language}.
${userPersona ? `User Voice / Background Persona: "${userPersona}". Reflect this natural style.` : ''}
${Array.isArray(previousComments) && previousComments.length > 0 ? `PREVIOUSLY GENERATED COMMENTS IN THIS SESSION (DO NOT REPEAT OR CLOSELY IMITATE ANY OF THESE):\n${previousComments.slice(-8).map((c: string) => `- "${c}"`).join('\n')}` : ''}

For the target post:
- Identify the core topic (1-3 words, e.g. "AI Engineering", "SaaS Growth", "Design Systems").
- Identify the post sentiment (e.g. "Optimistic", "Critical", "Analytical", "Humorous", "Reflective").
- Generate the Primary Comment according to the requested style: ${selectedTonePrompt}
- Generate 3 alternative variations:
  * "insightful": Adds value, nuance, or a useful perspective.
  * "casual": Relaxed, friendly, natural everyday phrasing.
  * "question": Asks a sharp, engaging question that invites a reply from the author.
`;

      const prompt = hasRealContent
        ? `Please carefully read and analyze this specific Twitter/X post and craft engaging, completely unique comments responding directly to the author's message:
${postContext}

Requested Primary Tone: ${tone}
Uniqueness Seed: ${post.tweetId || postIndex}-${Date.now()}
Remember: The comment MUST be specific to this exact post content, not a generic filler.`
        : `Please analyze this Twitter/X post and craft engaging, completely distinct comments:
${postContext}

Requested Primary Tone: ${tone}
Uniqueness Seed: ${post.tweetId || postIndex}-${Date.now()}
`;

      let parsedData: any = null;
      let retryDelay = 0;

      try {
        const { responseText, retryDelaySeconds } = await generateContentWithFallback(ai, {
          contents: prompt,
          systemInstruction: systemPrompt,
          temperature: 0.85,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tweetTextSummary: {
                type: Type.STRING,
                description: 'Brief 1-sentence summary of what the tweet is about',
              },
              topic: {
                type: Type.STRING,
                description: 'Short 1-3 word topic tag',
              },
              sentiment: {
                type: Type.STRING,
                description: 'Sentiment of the post',
              },
              primaryComment: {
                type: Type.STRING,
                description: 'The main recommended comment under 260 characters',
              },
              variations: {
                type: Type.OBJECT,
                properties: {
                  insightful: {
                    type: Type.STRING,
                    description: 'Insightful comment under 260 characters',
                  },
                  casual: {
                    type: Type.STRING,
                    description: 'Casual conversational comment under 260 characters',
                  },
                  question: {
                    type: Type.STRING,
                    description: 'Discussion-starter question under 260 characters',
                  },
                },
                required: ['insightful', 'casual', 'question'],
              },
            },
            required: ['primaryComment', 'variations', 'topic'],
          },
        });

        if (retryDelaySeconds) retryDelay = retryDelaySeconds;

        if (responseText) {
          try {
            parsedData = JSON.parse(responseText.trim());
          } catch {
            parsedData = null;
          }
        }
      } catch (err: any) {
        console.warn('AI generation attempt error:', err?.message || err);
      }

      // If AI model had quota issues or JSON parsing failed, use smart contextual fallback
      if (!parsedData || !parsedData.primaryComment) {
        parsedData = generateSmartFallback(
          tweetData?.text || post.tweetText || '',
          tweetData?.authorHandle || post.username || '',
          tone,
          postIndex || post.tweetId || String(Math.random()),
          previousComments
        );
      }

      return res.json({
        success: true,
        data: {
          url: post.url,
          tweetId: post.tweetId,
          authorName: tweetData?.authorName || post.authorName,
          authorHandle: tweetData?.authorHandle || post.authorHandle,
          tweetText: tweetData?.text || parsedData.tweetTextSummary || post.tweetText,
          topic: parsedData.topic || 'General',
          sentiment: parsedData.sentiment || 'Engaging',
          primaryComment: parsedData.primaryComment,
          variations: parsedData.variations,
          retryDelaySeconds: retryDelay,
        },
      });
    } catch (error: any) {
      console.error('Handled error in /api/generate-comment:', error);
      const fallback = generateSmartFallback(
        req.body?.post?.tweetText || '',
        req.body?.post?.username || '',
        req.body?.tone || 'engaging'
      );
      return res.json({
        success: true,
        data: {
          url: req.body?.post?.url || '',
          tweetId: req.body?.post?.tweetId || '',
          ...fallback,
          retryDelaySeconds: 2,
        },
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

      // Limit to 20 posts max as requested by user
      const targetPosts = posts.slice(0, 20);

      // Process in batches of 4 for speed & reliability
      const results = [];
      const batchSize = 4;
      for (let i = 0; i < targetPosts.length; i += batchSize) {
        const currentBatch = targetPosts.slice(i, i + batchSize);
        const batchPromises = currentBatch.map(async (p) => {
          try {
            let tweetData: TweetMetadata | null = null;
            if (p.tweetText && p.tweetText.trim()) {
              tweetData = {
                text: p.tweetText,
                authorName: p.authorName || '',
                authorHandle: p.authorHandle || '',
              };
            } else {
              tweetData = await fetchTweetData(p.url, p.tweetId);
            }

            const postContext = tweetData?.text
              ? `Tweet Text: "${tweetData.text}"
Author: ${tweetData.authorName || ''} (${tweetData.authorHandle || ''})
URL: ${p.url}`
              : `Tweet URL: ${p.url}
Tweet ID: ${p.tweetId}`;

            const { responseText } = await generateContentWithFallback(ai, {
              contents: `Analyze this post and generate an authentic, engaging comment under 260 characters and 3 style variations:
${postContext}
Tone: ${tone}`,
              systemInstruction: `You are an expert Twitter/X growth specialist. Write natural, punchy, high-engagement replies under 260 characters. No generic filler like "Great post!". Output language: ${language}. ${userPersona ? `Persona: ${userPersona}` : ''}`,
              temperature: 0.8,
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  tweetTextSummary: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  sentiment: { type: Type.STRING },
                  primaryComment: { type: Type.STRING },
                  variations: {
                    type: Type.OBJECT,
                    properties: {
                      insightful: { type: Type.STRING },
                      casual: { type: Type.STRING },
                      question: { type: Type.STRING },
                    },
                    required: ['insightful', 'casual', 'question'],
                  },
                },
                required: ['primaryComment', 'variations', 'topic'],
              },
            });

            let parsed: any = null;
            if (responseText) {
              try {
                parsed = JSON.parse(responseText.trim());
              } catch {
                parsed = null;
              }
            }

            if (!parsed || !parsed.primaryComment) {
              parsed = generateSmartFallback(tweetData?.text || p.tweetText || '', p.username || '', tone);
            }
            return {
              url: p.url,
              tweetId: p.tweetId,
              authorName: tweetData?.authorName || p.authorName,
              authorHandle: tweetData?.authorHandle || p.authorHandle,
              tweetText: tweetData?.text || parsed.tweetTextSummary || p.tweetText,
              topic: parsed.topic || 'General',
              sentiment: parsed.sentiment || 'Engaging',
              primaryComment: parsed.primaryComment,
              variations: parsed.variations,
            };
          } catch (err: any) {
            console.error(`Batch item failed for ${p.url}:`, err);
            return {
              url: p.url,
              tweetId: p.tweetId,
              error: err.message || 'Failed to analyze post',
              primaryComment: 'Interesting perspective on this. Would love to see how this plays out in practice.',
              variations: {
                insightful: 'Interesting perspective on this. Would love to see how this plays out in practice.',
                casual: 'Really solid take right here.',
                question: 'What has been your experience testing this out?',
              },
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
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
