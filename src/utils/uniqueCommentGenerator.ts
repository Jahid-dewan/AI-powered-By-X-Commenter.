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

export function getUniqueFallbackComment(
  postIndex: number,
  author: string,
  tone: CommentTone,
  existingComments: string[] = []
): DiverseCommentSet {
  const cleanAuthor = author ? author.replace(/^@/, '') : '';
  const idx = Math.abs(postIndex) % UNIQUE_PERSPECTIVES.length;
  const perspective = UNIQUE_PERSPECTIVES[idx];

  let primary = perspective.insightful;
  if (tone === 'question') {
    primary = perspective.question;
  } else if (tone === 'casual') {
    primary = cleanAuthor ? `@${cleanAuthor} ${perspective.casual}` : perspective.casual;
  } else if (tone === 'witty') {
    primary = `${perspective.casual} Makes legacy alternatives feel like dial-up internet.`;
  } else if (tone === 'supportive') {
    primary = `${perspective.casual} Really well executed!`;
  }

  // Ensure no duplicate with existing comments
  if (existingComments.includes(primary)) {
    const backup = UNIQUE_PERSPECTIVES[(idx + 1) % UNIQUE_PERSPECTIVES.length];
    primary = tone === 'question' ? backup.question : backup.insightful;
  }

  return {
    topic: perspective.topic,
    sentiment: perspective.sentiment,
    primaryComment: primary,
    variations: {
      insightful: perspective.insightful,
      casual: perspective.casual,
      question: perspective.question,
    },
  };
}
