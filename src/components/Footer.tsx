import React, { useState } from 'react';
import { Heart, Copy, Check, ExternalLink, Wallet } from 'lucide-react';

export const Footer: React.FC = () => {
  const [copied, setCopied] = useState<boolean>(false);
  const donationAddress = '0xC7F70bdD9f0886A9227223B2e1764cAD21D5562A';
  const twitterUrl = 'https://x.com/Naruto_Oxe911';

  const handleCopy = () => {
    navigator.clipboard.writeText(donationAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <footer className="mt-16 border-t border-zinc-200 bg-white/80 backdrop-blur-xs py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Creator & Social Info */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">Created by:</span>
            <span className="text-xs font-semibold text-zinc-900 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200">
              Ethan
            </span>
          </div>

          <span className="hidden sm:inline text-zinc-300">•</span>

          <a
            id="footer-follow-x-btn"
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 hover:text-black bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg transition-all shadow-2xs group"
          >
            <span className="font-mono font-bold text-xs text-zinc-900">𝕏</span>
            <span>Follow on X:</span>
            <span className="font-semibold text-zinc-900 group-hover:underline">@Naruto_Oxe911</span>
            <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
          </a>
        </div>

        {/* Donation Wallet Box */}
        <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-2.5 bg-zinc-50 border border-zinc-200/80 rounded-xl p-2.5 px-3.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>Donate:</span>
          </div>

          <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-zinc-200 max-w-full">
            <Wallet className="w-3 h-3 text-zinc-400 shrink-0" />
            <span
              className="text-[11px] font-mono text-zinc-700 truncate max-w-[200px] sm:max-w-[280px]"
              title={donationAddress}
            >
              {donationAddress}
            </span>
            <button
              id="copy-donation-address-btn"
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md transition-all cursor-pointer shrink-0 ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 active:scale-95'
              }`}
              title="Copy Donation Address"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
