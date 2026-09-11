import React, { useState } from 'react';
import { User, X, Check, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (name: string) => Promise<void>;
  currentUserName?: string | null;
  todayCount?: number;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  currentUserName,
  todayCount,
}) => {
  const [name, setName] = useState<string>(currentUserName || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      // If user submitted empty, allow friendly default or prompt
      setIsSubmitting(true);
      await onLogin('Friend');
      setIsSubmitting(false);
      onClose();
      return;
    }
    setIsSubmitting(true);
    await onLogin(trimmed);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div
      id="login-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose(); // No restriction if clicked outside
        }
      }}
    >
      <div
        id="login-modal-card"
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200"
      >
        {/* Close Button - No restriction */}
        <button
          id="login-modal-close-btn"
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors cursor-pointer"
          title="Close (no restriction, continue browsing freely)"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
              {currentUserName ? 'Welcome Back!' : 'Join / Login'}
            </h2>
            <p className="text-xs text-zinc-500">
              Zero hassle • Instant access • No password needed
            </p>
          </div>
        </div>

        {todayCount !== undefined && todayCount > 0 && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              <strong>{todayCount}</strong> {todayCount === 1 ? 'user has' : 'users have'} logged in today!
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="user-name-input"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
            >
              Enter your name
            </label>
            <div className="relative">
              <input
                id="user-name-input"
                type="text"
                autoFocus
                placeholder="e.g. Alex, Sarah, CryptoWhale"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 transition-all"
              />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Sign up and login are the same. Just enter your name.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <button
              id="login-skip-btn"
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Skip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
