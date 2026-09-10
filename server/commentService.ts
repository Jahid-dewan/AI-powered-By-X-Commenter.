import { GoogleGenAI, Type } from '@google/genai';
import { generateContentWithFallback, generateSmartFallback } from './aiHelper.ts';
import { fetchTweetData, type TweetMetadata } from './tweetService.ts';

export interface CommentGenerationParams {
  post: {
    id?: string;
    url: string;
    tweetId?: string;
    username?: string;
    authorName?: string;
    authorHandle?: string;
    tweetText?: string;
  };
  tone?: string;
  userPersona?: string;
  language?: string;
  previousComments?: string[];
  postIndex?: number;
}

export interface GeneratedCommentResult {
  url: string;
  tweetId: string;
  authorName?: string;
  authorHandle?: string;
  tweetText?: string;
  topic: string;
  sentiment: string;
  primaryComment: string;
  variations: {
    insightful: string;
    casual: string;
    question: string;
  };
  retryDelaySeconds?: number;
  hasApiKey: boolean;
}

const toneGuidance: Record<string, string> = {
  engaging: 'Engaging, thoughtful, and constructive. Adds a smart angle to the conversation without being pretentious.',
  insightful: 'Analytical, deep, and value-adding. Provides a unique counter-perspective or industry context.',
  casual: 'Laid back, friendly, conversational. Uses everyday Twitter phrasing without sounding overly corporate.',
  witty: 'Clever, humorous, slightly ironic or witty. Memorable and sharp.',
  supportive: 'Encouraging, positive, uplifting. Celebrates the author’s win or effort authentically.',
  question: 'Inquisitive and provocative. Asks a compelling question that makes the author want to reply.',
};

export async function processCommentGeneration(
  params: CommentGenerationParams
): Promise<GeneratedCommentResult> {
  const {
    post,
    tone = 'engaging',
    userPersona = '',
    language = 'English',
    previousComments = [],
    postIndex = 0,
  } = params;

  const apiKey = process.env.GEMINI_API_KEY || '';
  const hasApiKey = Boolean(apiKey && apiKey.trim());

  // If tweetText is missing, fetch it via tweetService
  let tweetData: TweetMetadata | null = null;
  if (post.tweetText && post.tweetText.trim()) {
    tweetData = {
      text: post.tweetText.trim(),
      authorName: post.authorName || '',
      authorHandle: post.authorHandle || '',
    };
  } else if (post.url) {
    tweetData = await fetchTweetData(post.url, post.tweetId || '');
  }

  const effectiveTweetText = tweetData?.text || post.tweetText || '';
  const effectiveAuthorName = tweetData?.authorName || post.authorName || '';
  const effectiveAuthorHandle = tweetData?.authorHandle || post.authorHandle || (post.username ? `@${post.username}` : '');

  const hasRealContent = Boolean(effectiveTweetText && effectiveTweetText.trim().length > 0);

  let parsedData: any = null;
  let retryDelay = 0;

  if (hasApiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const postContext = hasRealContent
        ? `EXACT POST CONTENT TO ANALYZE:
"${effectiveTweetText}"
Author: ${effectiveAuthorName} (${effectiveAuthorHandle})
Post URL: ${post.url}`
        : `Tweet URL: ${post.url}
Tweet ID: ${post.tweetId || ''}
Author Handle: ${post.username || ''}`;

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
- Gauge author sentiment (e.g. "Optimistic", "Contemplative", "Analytical", "Direct").
- Craft a primary reply following the requested tone: ${selectedTonePrompt}
- Craft 3 diverse style variations:
  * "insightful": Thoughtful perspective or observation under 260 characters.
  * "casual": Natural conversational tweet under 260 characters.
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
Uniqueness Seed: ${post.tweetId || postIndex}-${Date.now()}`;

      const { responseText, retryDelaySeconds } = await generateContentWithFallback(ai, {
        contents: prompt,
        systemInstruction: systemPrompt,
        temperature: 0.85,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tweetTextSummary: {
              type: Type.STRING,
              description: 'Brief summary or extracted main quote of the post content',
            },
            topic: {
              type: Type.STRING,
              description: 'Core subject matter in 1-3 words (e.g. AI Models, Startup Sales, TypeScript)',
            },
            sentiment: {
              type: Type.STRING,
              description: 'Emotional tone of the post (e.g. Optimistic, Critical, Inquisitive, Humorous)',
            },
            primaryComment: {
              type: Type.STRING,
              description: 'The best primary comment strictly matching the requested tone, under 260 characters',
            },
            variations: {
              type: Type.OBJECT,
              properties: {
                insightful: {
                  type: Type.STRING,
                  description: 'Deep, valuable analytical observation under 260 characters',
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
  }

  // If AI model had quota issues, missing key, or JSON parsing failed, use smart contextual fallback
  if (!parsedData || !parsedData.primaryComment) {
    parsedData = generateSmartFallback(
      effectiveTweetText,
      effectiveAuthorHandle || post.username || '',
      tone,
      postIndex || post.tweetId || String(Math.random()),
      previousComments
    );
  }

  return {
    url: post.url,
    tweetId: post.tweetId || '',
    authorName: effectiveAuthorName || post.authorName,
    authorHandle: effectiveAuthorHandle || post.authorHandle,
    tweetText: effectiveTweetText || parsedData.tweetTextSummary || post.tweetText,
    topic: parsedData.topic || 'General',
    sentiment: parsedData.sentiment || 'Engaging',
    primaryComment: parsedData.primaryComment,
    variations: parsedData.variations,
    retryDelaySeconds: retryDelay,
    hasApiKey,
  };
}
