import React, { useState } from 'react';
import { Sparkles, Trash2, PlusCircle, HelpCircle, SlidersHorizontal, Check, RefreshCw, Square } from 'lucide-react';
import { CommentTone } from '../types';

interface LinkInputSectionProps {
  rawInput: string;
  onInputChange: (value: string) => void;
  detectedCount: number;
  onAnalyzeAll: () => void;
  onStopAnalyzing?: () => void;
  isAnalyzing: boolean;
  pacingStatus?: string | null;
  onLoadSamples: () => void;
  onClear: () => void;
  selectedTone: CommentTone;
  onToneChange: (tone: CommentTone) => void;
  userPersona: string;
  onPersonaChange: (persona: string) => void;
}

const TONES: Array<{ id: CommentTone; label: string; description: string }> = [
  { id: 'engaging', label: 'Insightful & Engaging', description: 'Sharp observation with high value' },
  { id: 'casual', label: 'Casual & Conversational', description: 'Natural peer talk, authentic tone' },
  { id: 'question', label: 'Discussion Starter', description: 'Thoughtful question inviting replies' },
  { id: 'supportive', label: 'Supportive & Warm', description: 'Encouraging and validating' },
  { id: 'insightful', label: 'Deep Angle', description: 'Nuanced counter-point or framework' },
  { id: 'witty', label: 'Clever & Witty', description: 'Lighthearted, punchy remark' },
];

export const LinkInputSection: React.FC<LinkInputSectionProps> = ({
  rawInput,
  onInputChange,
  detectedCount,
  onAnalyzeAll,
  onStopAnalyzing,
  isAnalyzing,
  pacingStatus,
  onLoadSamples,
  onClear,
  selectedTone,
  onToneChange,
  userPersona,
  onPersonaChange,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div id="link-input-container" className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <label htmlFor="twitter-links-textarea" className="block text-sm font-semibold text-zinc-900">
            Paste Twitter / X Post Links & Content
          </label>
          <p className="text-xs text-zinc-500 mt-0.5">
            Paste up to 20 links. You can also include the tweet text directly below each link so AI analyzes the exact message!
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="load-samples-btn"
            type="button"
            onClick={onLoadSamples}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200/80 px-2.5 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Load Sample Links
          </button>
          {rawInput && (
            <button
              id="clear-links-btn"
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <textarea
          id="twitter-links-textarea"
          rows={5}
          value={rawInput}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={`https://x.com/karpathy/status/1626078345293238272\nThe hottest new programming language is English.\n\nhttps://x.com/sama/status/1725732152862085368\ni loved my time at openai. it was transformative...`}
          className="w-full font-mono text-xs sm:text-sm p-3.5 rounded-xl border border-zinc-300 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 outline-none transition-all resize-y text-zinc-800 placeholder:text-zinc-400 bg-zinc-50/50"
        />

        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                detectedCount === 0
                  ? 'bg-zinc-100 text-zinc-500'
                  : detectedCount <= 20
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {detectedCount} / 20 links detected
            </span>
            {detectedCount > 20 && (
              <span className="text-xs text-amber-600">
                (Maximum 20 links will be analyzed)
              </span>
            )}
          </div>

          <button
            id="toggle-custom-tone-btn"
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
              showSettings
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Style & Voice Settings
          </button>
        </div>
      </div>

      {showSettings && (
        <div id="settings-panel" className="mt-4 pt-4 border-t border-zinc-100 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
              Select Desired Comment Tone
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  id={`tone-select-${t.id}`}
                  type="button"
                  onClick={() => onToneChange(t.id)}
                  className={`text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    selectedTone === t.id
                      ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs'
                      : 'border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/70 text-zinc-700'
                  }`}
                >
                  <div className="font-medium flex items-center justify-between">
                    {t.label}
                    {selectedTone === t.id && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 line-clamp-1 ${
                      selectedTone === t.id ? 'text-zinc-300' : 'text-zinc-500'
                    }`}
                  >
                    {t.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="user-persona-input" className="block text-xs font-semibold text-zinc-800 mb-1">
              Your Persona / Niche (Optional)
            </label>
            <input
              id="user-persona-input"
              type="text"
              value={userPersona}
              onChange={(e) => onPersonaChange(e.target.value)}
              placeholder="e.g. AI Engineer & Founder, Indie Hacker, Tech Enthusiast, Product Designer..."
              className="w-full text-xs p-2.5 rounded-xl border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none text-zinc-800 placeholder:text-zinc-400 bg-white"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Provides context so the generated replies naturally reflect your domain expertise and voice.
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-100">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <HelpCircle className="w-4 h-4 text-zinc-400" />
          <span>
            {pacingStatus || 'Analyzes posts one by one with adaptive pacing to avoid rate limits.'}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isAnalyzing ? (
            <button
              id="stop-analyzing-btn"
              type="button"
              onClick={onStopAnalyzing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 cursor-pointer active:scale-98"
            >
              <Square className="w-3.5 h-3.5 fill-red-600 text-red-600" />
              <span>Stop Processing</span>
            </button>
          ) : (
            <button
              id="analyze-all-posts-btn"
              type="button"
              disabled={detectedCount === 0}
              onClick={onAnalyzeAll}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all shadow-xs cursor-pointer ${
                detectedCount === 0
                  ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  : 'bg-zinc-900 hover:bg-black text-white active:scale-98'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>
                {detectedCount > 0
                  ? `Analyze ${Math.min(detectedCount, 20)} Post${
                      Math.min(detectedCount, 20) === 1 ? '' : 's'
                    } One by One`
                  : 'Analyze Posts'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
