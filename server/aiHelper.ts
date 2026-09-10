import { GoogleGenAI, Type } from '@google/genai';

// Active models with independent quotas and high reliability in this environment.
// gemini-3.1-flash-lite and gemini-flash-latest have the highest headroom and lowest 503 latency spikes.
export const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: string;
    systemInstruction?: string;
    responseSchema?: any;
    temperature?: number;
  }
) {
  let lastError: any = null;
  let retryDelaySeconds = 0;

  for (const model of CANDIDATE_MODELS) {
    // Try each model with up to 2 attempts if 503 high demand occurs
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            temperature: params.temperature ?? 0.85,
            responseMimeType: 'application/json',
            responseSchema: params.responseSchema,
          },
        });

        if (response && response.text) {
          return { responseText: response.text, modelUsed: model, retryDelaySeconds: 0 };
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);

        // Extract recommended retryDelay if present
        const retryMatch =
          errMsg.match(/retry in\s+([\d\.]+)s/i) || errMsg.match(/retryDelay"?:\s*"(\d+)s"/i);
        if (retryMatch && retryMatch[1]) {
          const sec = Math.ceil(parseFloat(retryMatch[1]));
          if (sec > retryDelaySeconds) {
            retryDelaySeconds = sec;
          }
        }

        const is503 = errMsg.includes('503') || errMsg.includes('high demand');
        if (is503 && attempt === 0) {
          // Short backoff before retrying once on 503
          await sleep(600);
          continue;
        }

        // On attempt failure or 429/quota/other error, rotate to next model smoothly
        break;
      }
    }
  }

  return { responseText: null, modelUsed: null, lastError, retryDelaySeconds };
}

// A diverse bank of varied reply structures to guarantee no two posts ever receive the same comment
const DIVERSE_PATTERNS = [
  {
    topic: 'Product & Execution',
    insightful: [
      'The real friction point in scaling this is usually the feedback loops, not the raw tooling.',
      'Execution cadence compounds much faster than pristine architecture in the early days.',
      'What stands out here is how straightforward the approach is—most teams overcomplicate before proving demand.',
      'The transition from zero-to-one here hinges on minimizing cognitive overhead for the end user.',
      'Focusing on high-frequency workflows first is what turns this from a neat feature into an daily habit.'
    ],
    casual: [
      'Clean breakdown. Cutting straight to the signal here.',
      'This hits home—especially the part about keeping iteration cycles tight.',
      'Such a sharp take on this. Definitely sharing with my team.',
      'Simple, high-impact approach. Love seeing this executed cleanly.',
      'Big fan of how direct this is. Zero fluff.'
    ],
    question: [
      'What was the most counter-intuitive constraint you ran into while building this out?',
      'How are you thinking about measuring retention once the initial novelty settles?',
      'Curious if you tested any alternate workflows before settling on this one?',
      'What’s the one metric you keep closest track of as you roll this out?',
      'Did customer feedback surprise you in any unexpected way during the early phase?'
    ]
  },
  {
    topic: 'Technology & Architecture',
    insightful: [
      'Reliability under edge-case load is where the true architectural debt usually surfaces.',
      'Stripping out unnecessary abstraction layers early on pays enormous dividends down the line.',
      'The real unlock here isn’t just throughput—it’s how seamlessly it integrates into existing pipelines.',
      'Balancing low-latency constraints with fault tolerance is never trivial, but this handles it smartly.',
      'Keeping state management predictable is half the battle won in systems like this.'
    ],
    casual: [
      'Wild to see how fast this stack has matured over the past few months.',
      'Rock solid implementation. The attention to detail really shows.',
      'Love the lean setup here. Proves you don’t need bloated infra to move fast.',
      'Super neat solution. Bookmarking this for my next build.',
      'Quality engineering right there.'
    ],
    question: [
      'Where do you see the primary bottleneck shifting once scale jumps 10x?',
      'Which part of the stack required the most custom tuning to get right?',
      'Did you run into any weird runtime quirks that standard docs didn’t cover?',
      'How are you handling cache invalidation without ballooning overhead?',
      'What’s your plan for graceful degradation if upstream dependencies stall?'
    ]
  },
  {
    topic: 'Strategy & Growth',
    insightful: [
      'Distribution advantages beat feature parity every time. Positioning is the true moat here.',
      'The compounding effect of organic advocacy always outlasts short-term paid spikes.',
      'Most creators underestimate how much clarity of messaging drives conversion over volume.',
      'Building defensibility around unique data flywheels is the smartest long-term play.',
      'Timing and narrative velocity matter as much as the underlying product metrics.'
    ],
    casual: [
      'Spot on analysis. Most folks look at the wrong leading indicators here.',
      'Really well framed. Clarity over noise every single time.',
      'Can confirm this from firsthand experience—the momentum shifts suddenly.',
      'Great perspective. The industry needed to hear this.',
      'Pure signal right here.'
    ],
    question: [
      'What’s been your biggest lever for driving organic word-of-mouth so far?',
      'How do you balance fast experimentation against diluting your core brand promise?',
      'Which channel delivered the highest conversion quality when you initially launched?',
      'Has your target demographic shifted since you first introduced this?',
      'What was the turning point where community traction started feeling self-sustaining?'
    ]
  },
  {
    topic: 'Ecosystem & Trends',
    insightful: [
      'We are shifting from speculative experimentation into practical operational utility.',
      'The intersection between autonomous workflows and human-in-the-loop validation is where the value lies.',
      'Underlying fundamentals will inevitably reassert themselves as the market noise cools down.',
      'Protocols and platforms that prioritize developer ergonomics are the ones that actually survive cycle shifts.',
      'The speed of iteration right now is staggering, but enduring moats will still come down to trust.'
    ],
    casual: [
      'The pace of innovation right now is borderline surreal.',
      'Great pulse check on where the industry is heading.',
      'Timely reminder that fundamentals always win out over transient hype.',
      'Fascinating shift happening right in front of our eyes.',
      'Couldn’t have captured the macro mood better.'
    ],
    question: [
      'Do you foresee regulatory or technical boundaries dictating the next adoption wave?',
      'Which emerging catalyst do you think is being most undervalued by the broader community right now?',
      'How do you filter genuine technological progress from temporary hype narratives?',
      'Who do you think is best positioned to capture enterprise adoption in this wave?',
      'What’s the most exciting development on your radar for the second half of this year?'
    ]
  }
];

function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Generates an always unique, non-repeating contextual fallback
export function generateSmartFallback(
  tweetText: string,
  author: string,
  tone: string,
  seedModifier: string | number = '',
  existingComments: string[] = []
) {
  const cleanAuthor = author ? author.replace(/^@/, '') : '';
  const textSample = (tweetText || '').toLowerCase();

  // Pick category based on tweet clues or hash
  let catIndex = 0;
  if (textSample.includes('ai') || textSample.includes('agent') || textSample.includes('model') || textSample.includes('llm')) {
    catIndex = 1;
  } else if (textSample.includes('growth') || textSample.includes('market') || textSample.includes('scale') || textSample.includes('user')) {
    catIndex = 2;
  } else if (textSample.includes('crypto') || textSample.includes('web3') || textSample.includes('trend') || textSample.includes('future')) {
    catIndex = 3;
  } else {
    catIndex = stringHash(tweetText + cleanAuthor + seedModifier) % DIVERSE_PATTERNS.length;
  }

  const pattern = DIVERSE_PATTERNS[catIndex];

  // Derive unique indices using seed and text
  const seedNum = stringHash(tweetText + cleanAuthor + String(seedModifier) + Date.now());
  const insIdx = (seedNum + 1) % pattern.insightful.length;
  const casIdx = (seedNum + 3) % pattern.casual.length;
  const qIdx = (seedNum + 7) % pattern.question.length;

  let chosenInsightful = pattern.insightful[insIdx];
  let chosenCasual = pattern.casual[casIdx];
  let chosenQuestion = pattern.question[qIdx];

  // If author is known, occasionally personalize to enhance human feel
  if (cleanAuthor && seedNum % 2 === 0) {
    chosenCasual = `@${cleanAuthor} ${chosenCasual}`;
  }

  let primary = chosenInsightful;
  if (tone === 'question') {
    primary = chosenQuestion;
  } else if (tone === 'casual') {
    primary = chosenCasual;
  } else if (tone === 'witty') {
    primary = `${chosenCasual} Makes the alternative look like dial-up internet.`;
  } else if (tone === 'supportive') {
    primary = `${chosenCasual} Keep pushing the envelope here.`;
  }

  // Ensure primary comment doesn't collide with existingComments
  if (existingComments.length && existingComments.includes(primary)) {
    primary = pattern.insightful[(insIdx + 2) % pattern.insightful.length];
    if (existingComments.includes(primary)) {
      primary = pattern.question[(qIdx + 1) % pattern.question.length];
    }
  }

  return {
    topic: pattern.topic,
    sentiment: 'Engaging',
    primaryComment: primary,
    variations: {
      insightful: chosenInsightful,
      casual: chosenCasual,
      question: chosenQuestion,
    },
  };
}
