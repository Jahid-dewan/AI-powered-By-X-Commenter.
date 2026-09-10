import React from 'react';
import { MessageSquarePlus, Sparkles, ExternalLink, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  totalCount: number;
  readyCount: number;
  commentedCount: number;
}

export const Header: React.FC<HeaderProps> = ({ totalCount, readyCount, commentedCount }) => {
  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <span className="font-mono text-base tracking-tighter">𝕏</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">
                Twitter/X Comment Assistant
              </h1>
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                AI Powered
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Paste up to 20 post links, generate smart replies, and prompt direct comments
            </p>
          </div>
        </div>

        {totalCount > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-700 font-medium">
              <span className="text-zinc-500">Links:</span>
              <span className="font-semibold text-zinc-900">{totalCount}/20</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-medium">
              <MessageSquarePlus className="w-3.5 h-3.5 text-blue-600" />
              <span>Ready:</span>
              <span className="font-semibold text-blue-900">{readyCount}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Commented:</span>
              <span className="font-semibold text-emerald-900">{commentedCount}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
