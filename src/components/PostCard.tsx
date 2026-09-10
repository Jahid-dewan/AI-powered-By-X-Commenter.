import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Send,
  MessageCircle,
  AlertCircle,
  Clock,
  CheckCircle2,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { TweetPostItem } from '../types';

interface PostCardProps {
  post: TweetPostItem;
  index: number;
  onUpdateComment: (id: string, comment: string) => void;
  onUpdateTweetText?: (id: string, text: string) => void;
  onRegenerate: (id: string) => void;
  onRemove: (id: string) => void;
  onMarkCommented: (id: string) => void;
  isProcessing: boolean;
  onFetchTweetInfo?: (id: string) => Promise<void> | void;
  isFetchingInfo?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  index,
  onUpdateComment,
  onUpdateTweetText,
  onRegenerate,
  onRemove,
  onMarkCommented,
  isProcessing,
  onFetchTweetInfo,
  isFetchingInfo,
}) => {
  const [copied, setCopied] = useState(false);
  const [justPrompted, setJustPrompted] = useState(false);
  const [isEditingTweetText, setIsEditingTweetText] = useState(false);

  const commentText = post.generatedComment || '';
  const charCount = commentText.length;
  const isOverLimit = charCount > 280;

  const handleCopyComment = async () => {
    if (!commentText) return;
    try {
      await navigator.clipboard.writeText(commentText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  /**
   * Primary Action: Opens Twitter/X reply web intent with the comment pre-filled
   * and copies it to clipboard as a guaranteed fallback.
   */
  const handlePromptCommentToX = async () => {
    if (!commentText) return;

    // 1. Copy comment to clipboard
    try {
      await navigator.clipboard.writeText(commentText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.warn('Clipboard write warning:', e);
    }

    // 2. Build Twitter / X reply web intent
    // Format: https://x.com/intent/post?in_reply_to=TWEET_ID&text=COMMENT
    const encodedText = encodeURIComponent(commentText);
    const intentUrl = post.tweetId
      ? `https://x.com/intent/post?in_reply_to=${post.tweetId}&text=${encodedText}`
      : `https://x.com/intent/post?text=${encodedText}`;

    // 3. Launch window to X
    window.open(intentUrl, '_blank', 'noopener,noreferrer');

    // 4. Mark as commented
    onMarkCommented(post.id);
    setJustPrompted(true);
    setTimeout(() => setJustPrompted(false), 5000);
  };

  const selectVariation = (varText: string) => {
    onUpdateComment(post.id, varText);
  };

  return (
    <div
      id={`post-card-${post.id}`}
      className={`rounded-2xl border transition-all duration-200 bg-white shadow-xs ${
        post.hasCommented
          ? 'border-emerald-200 bg-emerald-50/10'
          : post.status === 'error'
          ? 'border-red-200'
          : 'border-zinc-200 hover:border-zinc-300'
      }`}
    >
      {/* Card Header */}
      <div className="p-4 sm:p-5 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold flex items-center justify-center">
            {index + 1}
          </span>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs sm:text-sm text-zinc-900">
                {post.authorName || `@${post.username || 'user'}`}
              </span>
              {post.authorHandle && post.authorName && (
                <span className="text-xs text-zinc-500 font-mono">
                  {post.authorHandle}
                </span>
              )}
            </div>
            <a
              id={`post-link-${post.id}`}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-zinc-400 hover:text-blue-600 inline-flex items-center gap-1 transition-colors font-mono line-clamp-1"
              title={post.url}
            >
              <span>{post.url}</span>
              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
            </a>
          </div>
        </div>

        {/* Status and Tags */}
        <div className="flex items-center gap-2">
          {post.topic && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
              {post.topic}
            </span>
          )}

          {post.hasCommented ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Commented
            </span>
          ) : post.status === 'ready' ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3 h-3 text-blue-600" />
              Comment Ready
            </span>
          ) : post.status === 'analyzing' || isProcessing ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
              Analyzing...
            </span>
          ) : post.status === 'error' ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
              <AlertCircle className="w-3 h-3 text-red-600" />
              Error
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
              Pending
            </span>
          )}

          <button
            id={`remove-post-${post.id}`}
            type="button"
            onClick={() => onRemove(post.id)}
            className="text-zinc-400 hover:text-red-600 p-1 rounded-md transition-colors cursor-pointer"
            title="Remove from list"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tweet Context / Preview */}
      <div className="px-4 sm:px-5 pt-3 pb-2 text-xs">
        {post.tweetText ? (
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 leading-relaxed font-sans">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Analyzed Post Content
              </span>
              <button
                type="button"
                onClick={() => setIsEditingTweetText(!isEditingTweetText)}
                className="text-[11px] text-zinc-500 hover:text-zinc-900 underline cursor-pointer"
              >
                {isEditingTweetText ? 'Done Editing' : 'Edit Post Text'}
              </button>
            </div>
            {!isEditingTweetText ? (
              <p className="whitespace-pre-line text-xs sm:text-sm text-zinc-700 italic">
                "{post.tweetText}"
              </p>
            ) : (
              <textarea
                rows={3}
                value={post.tweetText}
                onChange={(e) => onUpdateTweetText?.(post.id, e.target.value)}
                placeholder="Edit post content..."
                className="w-full text-xs sm:text-sm p-2 rounded-lg border border-zinc-300 outline-none text-zinc-800 bg-white focus:border-zinc-900"
              />
            )}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-zinc-700">
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <span className="text-[11px] font-semibold text-amber-900 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Post Content (Paste or auto-detect)
              </span>
              <div className="flex items-center gap-2">
                {onFetchTweetInfo && (
                  <button
                    id={`auto-detect-btn-${post.id}`}
                    type="button"
                    disabled={isFetchingInfo || isProcessing}
                    onClick={() => onFetchTweetInfo(post.id)}
                    className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isFetchingInfo ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                        <span>Detecting...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>Auto-Detect with AI</span>
                      </>
                    )}
                  </button>
                )}
                <span className="text-[10px] text-amber-700 font-medium hidden sm:inline">
                  Guarantees unique comments
                </span>
              </div>
            </div>
            <textarea
              rows={2}
              value={post.tweetText || ''}
              onChange={(e) => onUpdateTweetText?.(post.id, e.target.value)}
              placeholder="Click 'Auto-Detect with AI' above or paste what this post says..."
              className="w-full text-xs p-2 rounded-lg border border-amber-200 focus:border-zinc-900 outline-none text-zinc-800 bg-white placeholder:text-zinc-400"
            />
          </div>
        )}
      </div>

      {/* Generated Comment Section */}
      <div className="p-4 sm:p-5 pt-2">
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor={`comment-box-${post.id}`}
            className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5 text-zinc-700" />
            AI Generated Comment
          </label>

          <div className="flex items-center gap-3">
            {/* Character counter */}
            <span
              className={`text-xs font-mono font-medium ${
                isOverLimit
                  ? 'text-red-600 font-bold'
                  : charCount > 250
                  ? 'text-amber-600'
                  : 'text-zinc-500'
              }`}
            >
              {charCount} / 280
            </span>

            {post.status === 'idle' ? (
              <button
                id={`analyze-single-btn-${post.id}`}
                type="button"
                onClick={() => onRegenerate(post.id)}
                disabled={isProcessing}
                className="text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer font-medium"
              >
                <Sparkles className="w-3 h-3 text-blue-600" />
                Analyze This Post
              </button>
            ) : (
              <button
                id={`regenerate-btn-${post.id}`}
                type="button"
                onClick={() => onRegenerate(post.id)}
                disabled={isProcessing}
                className="text-xs text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer"
                title="Regenerate this comment"
              >
                <RefreshCw className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
                {post.status === 'error' ? 'Retry AI' : 'Regenerate'}
              </button>
            )}
          </div>
        </div>

        {/* Comment Editable Textarea */}
        <div className="relative">
          <textarea
            id={`comment-box-${post.id}`}
            rows={3}
            value={commentText}
            onChange={(e) => onUpdateComment(post.id, e.target.value)}
            placeholder={
              post.status === 'analyzing'
                ? 'Analyzing tweet and drafting comment...'
                : 'Click "Analyze Posts" or "Regenerate" to generate a comment.'
            }
            className={`w-full text-xs sm:text-sm p-3 rounded-xl border outline-none transition-all resize-y text-zinc-900 ${
              isOverLimit
                ? 'border-red-400 bg-red-50/30 focus:ring-1 focus:ring-red-400'
                : 'border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 bg-white'
            }`}
          />
        </div>

        {/* Alternative Variations Quick Switcher */}
        {post.commentVariations && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-zinc-500 font-medium mr-1">
              Alternative Angles:
            </span>
            {post.commentVariations.insightful && (
              <button
                type="button"
                onClick={() => selectVariation(post.commentVariations!.insightful)}
                className={`text-[11px] px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                  commentText === post.commentVariations.insightful
                    ? 'bg-zinc-900 text-white border-zinc-900 font-medium'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                }`}
              >
                Insightful
              </button>
            )}
            {post.commentVariations.casual && (
              <button
                type="button"
                onClick={() => selectVariation(post.commentVariations!.casual)}
                className={`text-[11px] px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                  commentText === post.commentVariations.casual
                    ? 'bg-zinc-900 text-white border-zinc-900 font-medium'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                }`}
              >
                Casual
              </button>
            )}
            {post.commentVariations.question && (
              <button
                type="button"
                onClick={() => selectVariation(post.commentVariations!.question)}
                className={`text-[11px] px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                  commentText === post.commentVariations.question
                    ? 'bg-zinc-900 text-white border-zinc-900 font-medium'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                }`}
              >
                Question
              </button>
            )}
          </div>
        )}

        {/* Primary Action Button: "Comment on X" */}
        <div className="mt-4 pt-3 border-t border-zinc-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              id={`copy-comment-${post.id}`}
              type="button"
              onClick={handleCopyComment}
              disabled={!commentText}
              className="text-xs font-medium px-3 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            <a
              id={`open-post-btn-${post.id}`}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium px-3 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors inline-flex items-center gap-1.5"
            >
              <span>View Post</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </a>
          </div>

          {/* THE PROMPT-REQUESTED COMMENT BUTTON */}
          <button
            id={`comment-button-${post.id}`}
            type="button"
            onClick={handlePromptCommentToX}
            disabled={!commentText || isProcessing}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer ${
              !commentText
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                : post.hasCommented
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-zinc-900 hover:bg-black text-white active:scale-98'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>
              {post.hasCommented ? 'Comment on X Again' : 'Comment on X'}
            </span>
          </button>
        </div>

        {/* Notification when prompted */}
        {justPrompted && (
          <div className="mt-2.5 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Comment copied to clipboard & reply composer opened on X!
            </span>
            <span className="text-[11px] text-emerald-600">Just click "Post"</span>
          </div>
        )}
      </div>
    </div>
  );
};
