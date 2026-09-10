import { CommentTone } from '../types';

interface DiverseCommentSet {
  topic: string;
  sentiment: string;
  primaryComment: string;
  variations: {
    insightful: string;
    casual: string;
    question: string;
  };
}

const UNIQUE_PERSPECTIVES = [
  {
    topic: 'Tech & Architecture',
    sentiment: 'Analytical',
    insightful: 'The trade-off between architectural purity and shipping speed is where most senior teams spend 80% of their debate cycles.',
    casual: 'Rock solid execution here. Cutting right past the usual over-engineering.',
    question: 'What was the toughest edge case you had to account for once real traffic hit?',
  },
  {
    topic: 'Product & UX',
    sentiment: 'Thoughtful',
    insightful: 'Reducing cognitive load in the initial 10 seconds matters 10x more than adding an extra secondary feature.',
    casual: 'Super clean flow. Love how straightforward this is to understand.',
    question: 'How are you tracking user drop-off across the onboarding steps?',
  },
  {
    topic: 'Growth & Strategy',
    sentiment: 'Strategic',
    insightful: 'Distribution advantages consistently outperform feature parity over a 12-month horizon.',
    casual: 'Spot on breakdown. Most builders look at vanity numbers instead of this.',
    question: 'Which distribution channel proved most resilient when you launched this?',
  },
  {
    topic: 'AI & Engineering',
    sentiment: 'Optimistic',
    insightful: 'The real unlock is combining deterministic heuristic guardrails with non-deterministic model outputs.',
    casual: 'The iteration speed on this right now is unreal. Huge momentum.',
    question: 'How are you balancing latency against output consistency here?',
  },
  {
    topic: 'Startups & Shipping',
    sentiment: 'Direct',
    insightful: 'Tighter feedback loops will always compound faster than extensive roadmap documentation.',
    casual: 'Pure signal right here. Love seeing teams ship with this velocity.',
    question: 'What surprised you most about user behavior once this went live?',
  },
  {
    topic: 'Ecosystem & Market',
    sentiment: 'Insightful',
    insightful: 'Market noise always fades, but ergonomic tooling and developer experience endure every cycle.',
    casual: 'Fascinating macro perspective. Spot on take.',
    question: 'Where do you see the biggest friction point in adoption over the next year?',
  },
];

/**
 * Extracts a punchy subject phrase from post text to ground fallback comments
 */
function extractSubjectSnippet(text?: string): string {
  if (!text || !text.trim()) return '';
  const clean = text.replace(/https?:\/\/\S+/g, '').replace(/[@#]/g, '').trim();
  const sentences = clean.split(/[.!?\n]+/).filter(Boolean);
  if (sentences.length > 0) {
    const first = sentences[0].trim();
    if (first.length > 10 && first.length < 80) return first;
    if (first.length >= 80) return first.slice(0, 75).trim() + '...';
  }
  return clean.slice(0, 60).trim();
}

export function getUniqueFallbackComment(
  postIndex: number,
  author: string,
  tone: CommentTone,
  existingComments: string[] = [],
  tweetText?: string
): DiverseCommentSet {
  const cleanAuthor = author ? author.replace(/^@/, '') : '';
  const snippet = extractSubjectSnippet(tweetText);
  const idx = Math.abs(postIndex) % UNIQUE_PERSPECTIVES.length;
  const perspective = UNIQUE_PERSPECTIVES[idx];

  let insightful = perspective.insightful;
  let casual = perspective.casual;
  let question = perspective.question;

  // If post text is available, contextualize comments specifically to that post
  if (snippet) {
    insightful = `Regarding "${snippet}" — the non-obvious factor is how rapidly user expectations are evolving around this.`;
    casual = cleanAuthor
      ? `@${cleanAuthor} strong point regarding "${snippet}". Exactly what the space needed to hear.`
      : `Strong point on "${snippet}". Totally matches what we're seeing in practice.`;
    question = `On the point about "${snippet}" — what do you think is the biggest bottleneck to wide adoption here?`;
  }

  let primary = insightful;
  if (tone === 'question') {
    primary = question;
  } else if (tone === 'casual') {
    primary = cleanAuthor && !primary.startsWith('@') ? `@${cleanAuthor} ${casual}` : casual;
  } else if (tone === 'witty') {
    primary = snippet
      ? `"${snippet}" — putting this on a billboard outside every tech office tomorrow.`
      : `${casual} Makes legacy alternatives feel like dial-up internet.`;
  } else if (tone === 'supportive') {
    primary = snippet
      ? `Huge respect for highlighting "${snippet}". Incredibly well articulated.`
      : `${casual} Really well executed!`;
  }

  // Ensure uniqueness against previously generated comments
  let attempts = 0;
  while (existingComments.includes(primary) && attempts < 10) {
    const offset = (idx + attempts + 1) % UNIQUE_PERSPECTIVES.length;
    const backup = UNIQUE_PERSPECTIVES[offset];
    primary = tone === 'question' ? backup.question : backup.insightful;
    if (snippet) {
      primary = `${primary} (Key takeaway from "${snippet}")`;
    }
    attempts++;
  }

  return {
    topic: perspective.topic,
    sentiment: perspective.sentiment,
    primaryComment: primary,
    variations: {
      insightful,
      casual,
      question,
    },
  };
}
