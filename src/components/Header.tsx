import React, { useState } from 'react';
import { MessageSquarePlus, Sparkles, ExternalLink, CheckCircle2, Heart, Copy, Check } from 'lucide-react';

interface HeaderProps {
  totalCount: number;
  readyCount: number;
  commentedCount: number;
}

export const Header: React.FC<HeaderProps> = ({ totalCount, readyCount, commentedCount }) => {
  const [copiedDonate, setCopiedDonate] = useState<boolean>(false);
  const donationAddress = '0xC7F70bdD9f0886A9227223B2e1764cAD21D5562A';

  const handleCopyDonate = () => {
    navigator.clipboard.writeText(donationAddress);
    setCopiedDonate(true);
    setTimeout(() => setCopiedDonate(false), 2000);
  };

  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
            <span className="font-mono text-base tracking-tighter">𝕏</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">
                Twitter/X Comment Assistant
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                AI Powered
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500 mt-0.5">
              <span>Paste up to 20 post links and craft direct comments</span>
              <span className="hidden sm:inline text-zinc-300">•</span>
              <span className="text-zinc-600">
                Created by <strong className="text-zinc-800 font-semibold">Ethan</strong>
              </span>
              <span className="text-zinc-300">•</span>
              <a
                id="header-creator-x-link"
                href="https://x.com/Naruto_Oxe911"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-zinc-700 hover:text-black font-medium hover:underline"
              >
                <span>Follow on 𝕏 (@Naruto_Oxe911)</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto text-xs">
          {totalCount > 0 && (
            <>
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
            </>
          )}

          {/* Header Donate Button */}
          <button
            id="header-donate-btn"
            type="button"
            onClick={handleCopyDonate}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer shadow-2xs ${
              copiedDonate
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 active:scale-95'
            }`}
            title={`Donate EVM: ${donationAddress} (Click to copy)`}
          >
            {copiedDonate ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Address Copied!</span>
              </>
            ) : (
              <>
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                <span>Donate</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
