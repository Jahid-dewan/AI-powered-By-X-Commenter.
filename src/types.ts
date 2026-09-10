export interface TweetPostItem {
  id: string; // unique local ID
  url: string; // original URL
  tweetId: string; // extracted tweet status ID
  username: string; // author handle or 'twitter'
  status: 'idle' | 'fetching' | 'analyzing' | 'ready' | 'error';
  error?: string;
  authorName?: string;
  authorHandle?: string;
  tweetText?: string;
  generatedComment?: string;
  commentVariations?: {
    insightful: string;
    casual: string;
    question: string;
  };
  topic?: string;
  sentiment?: string;
  hasCommented?: boolean;
  commentedAt?: string;
}

export type CommentTone =
  | 'engaging'
  | 'insightful'
  | 'supportive'
  | 'casual'
  | 'question'
  | 'witty';

export interface BatchAnalysisResponse {
  results: Array<{
    url: string;
    tweetId: string;
    authorName?: string;
    authorHandle?: string;
    tweetText?: string;
    topic?: string;
    sentiment?: string;
    primaryComment: string;
    variations: {
      insightful: string;
      casual: string;
      question: string;
    };
    error?: string;
  }>;
}
