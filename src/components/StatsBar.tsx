import React from 'react';
import { CheckCircle2, MessageSquare, Send, Sparkles } from 'lucide-react';
import { TweetPostItem } from '../types';

interface StatsBarProps {
  posts: TweetPostItem[];
  onCommentNextPending: () => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({ posts, onCommentNextPending }) => {
  const total = posts.length;
  if (total === 0) return null;

  const commented = posts.filter((p) => p.hasCommented).length;
  const ready = posts.filter((p) => p.status === 'ready' && !p.hasCommented).length;
  const progressPercent = Math.round((commented / total) * 100);

  const nextPending = posts.find((p) => p.status === 'ready' && !p.hasCommented);

  return (
    <div id="stats-workflow-bar" className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-zinc-900">
              Engagement Progress
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              {commented} / {total} posts commented ({progressPercent}%)
            </span>
          </div>

          <div className="w-full sm:w-64 h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {nextPending ? (
            <button
              id="comment-next-pending-btn"
              type="button"
              onClick={onCommentNextPending}
              className="text-xs font-medium bg-zinc-900 hover:bg-black text-white px-3.5 py-2 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Prompt Next Post (#{posts.indexOf(nextPending) + 1})</span>
            </button>
          ) : commented === total && total > 0 ? (
            <div className="text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              All {total} posts commented!
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
