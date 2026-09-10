/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { LinkInputSection } from './components/LinkInputSection';
import { PostCard } from './components/PostCard';
import { StatsBar } from './components/StatsBar';
import { Footer } from './components/Footer';
import { extractTwitterUrls, SAMPLE_INPUT_TEXT } from './utils/twitterParser';
import { getUniqueFallbackComment } from './utils/uniqueCommentGenerator';
import { TweetPostItem, CommentTone } from './types';
import { Sparkles, MessageCircle, Info, RefreshCw, Layers } from 'lucide-react';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function App() {
  const [rawInput, setRawInput] = useState<string>('');
  const [posts, setPosts] = useState<TweetPostItem[]>([]);
  const [selectedTone, setSelectedTone] = useState<CommentTone>('engaging');
  const [userPersona, setUserPersona] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzingIndex, setAnalyzingIndex] = useState<number>(-1);
  const [pacingStatus, setPacingStatus] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const stopRequestedRef = useRef<boolean>(false);

  // Sync raw input to posts list, preserving existing generated content
  const handleInputChange = (newText: string) => {
    setRawInput(newText);
    const parsed = extractTwitterUrls(newText, 20);

    setPosts((prevPosts) => {
      // Map previous posts by tweetId to keep comments intact if already generated
      const prevMap = new Map<string, TweetPostItem>(prevPosts.map((p) => [p.tweetId, p]));

      return parsed.map((item) => {
        const existing = prevMap.get(item.tweetId);
        if (existing) {
          return {
            ...item,
            status: existing.status,
            authorName: existing.authorName,
            authorHandle: existing.authorHandle,
            tweetText: existing.tweetText,
            generatedComment: existing.generatedComment,
            commentVariations: existing.commentVariations,
            topic: existing.topic,
            sentiment: existing.sentiment,
            hasCommented: existing.hasCommented,
            commentedAt: existing.commentedAt,
          };
        }
        return item;
      });
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  const handleLoadSamples = () => {
    handleInputChange(SAMPLE_INPUT_TEXT);
    showToast('Loaded 3 sample posts with full text!');
  };

  const handleClear = () => {
    setRawInput('');
    setPosts([]);
  };

  const updateSinglePost = (id: string, updates: Partial<TweetPostItem>) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const handleUpdateTweetText = (id: string, newText: string) => {
    updateSinglePost(id, { tweetText: newText });
  };

  const handleUpdateComment = (id: string, newComment: string) => {
    updateSinglePost(id, { generatedComment: newComment });
  };

  const handleMarkCommented = (id: string) => {
    updateSinglePost(id, {
      hasCommented: true,
      commentedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  };

  const handleRemovePost = (id: string) => {
    setPosts((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      // Also update rawInput
      const remainingUrls = remaining.map((p) => p.url).join('\n');
      setRawInput(remainingUrls);
      return remaining;
    });
  };

  // Analyze single post
  const analyzeSinglePost = useCallback(
    async (
      targetPost: TweetPostItem,
      tone: CommentTone = selectedTone,
      postIndex = 0,
      existingComments: string[] = []
    ) => {
      updateSinglePost(targetPost.id, { status: 'analyzing', error: undefined });

      try {
        const response = await fetch('/api/generate-comment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            post: targetPost,
            tone,
            userPersona,
            previousComments: existingComments,
            postIndex,
          }),
        });

        const resData = await response.json().catch(() => ({}));
        if (resData.success && resData.data) {
          const {
            authorName,
            authorHandle,
            tweetText,
            topic,
            sentiment,
            primaryComment,
            variations,
            retryDelaySeconds,
          } = resData.data;

          updateSinglePost(targetPost.id, {
            status: 'ready',
            authorName: authorName || targetPost.authorName,
            authorHandle: authorHandle || targetPost.authorHandle,
            tweetText: tweetText || targetPost.tweetText,
            topic,
            sentiment,
            generatedComment: primaryComment,
            commentVariations: variations,
            error: undefined,
          });

          return {
            success: true,
            comment: primaryComment,
            retryDelaySeconds: retryDelaySeconds || 0,
          };
        } else {
          // If server reported error or quota exhaustion, generate a completely unique fallback comment
          const uniqueFallback = getUniqueFallbackComment(
            postIndex,
            targetPost.username || '',
            tone,
            existingComments,
            targetPost.tweetText
          );

          updateSinglePost(targetPost.id, {
            status: 'ready',
            topic: uniqueFallback.topic,
            sentiment: uniqueFallback.sentiment,
            generatedComment: uniqueFallback.primaryComment,
            commentVariations: uniqueFallback.variations,
          });
          return {
            success: true,
            comment: uniqueFallback.primaryComment,
            retryDelaySeconds: 2,
          };
        }
      } catch (err: any) {
        console.warn(`Handled error analyzing post ${targetPost.url}:`, err);
        const uniqueFallback = getUniqueFallbackComment(
          postIndex,
          targetPost.username || '',
          tone,
          existingComments,
          targetPost.tweetText
        );

        updateSinglePost(targetPost.id, {
          status: 'ready',
          topic: uniqueFallback.topic,
          sentiment: uniqueFallback.sentiment,
          generatedComment: uniqueFallback.primaryComment,
          commentVariations: uniqueFallback.variations,
        });
        return {
          success: true,
          comment: uniqueFallback.primaryComment,
          retryDelaySeconds: 2,
        };
      }
    },
    [selectedTone, userPersona]
  );

  // Stop analysis sequence
  const handleStopAnalyzing = () => {
    stopRequestedRef.current = true;
    setIsAnalyzing(false);
    setAnalyzingIndex(-1);
    setPacingStatus(null);
    showToast('Analysis stopped.');
  };

  // Batch analyze all posts one-by-one with polite adaptive pacing
  const handleAnalyzeAll = async () => {
    if (posts.length === 0 || isAnalyzing) return;

    stopRequestedRef.current = false;
    setIsAnalyzing(true);
    showToast(`Analyzing ${posts.length} posts one by one...`);

    const accumulatedComments: string[] = [];

    for (let i = 0; i < posts.length; i++) {
      if (stopRequestedRef.current) {
        break;
      }

      setAnalyzingIndex(i);
      setPacingStatus(`Analyzing post ${i + 1} of ${posts.length}...`);

      const post = posts[i];
      const result = await analyzeSinglePost(
        post,
        selectedTone,
        i,
        accumulatedComments
      );

      if (result?.comment) {
        accumulatedComments.push(result.comment);
      }

      // If user clicked stop during fetch
      if (stopRequestedRef.current) {
        break;
      }

      // If there are more posts to analyze, pause politely to respect free tier rate limits
      if (i < posts.length - 1) {
        const waitTimeSec =
          result?.retryDelaySeconds && result.retryDelaySeconds > 0
            ? Math.min(result.retryDelaySeconds, 5)
            : 2; // 2 seconds between posts is safe and responsive
        setPacingStatus(
          `Post ${i + 1} ready. Pacing ${waitTimeSec}s before post ${i + 2}...`
        );
        await delay(waitTimeSec * 1000);
      }
    }

    setAnalyzingIndex(-1);
    setIsAnalyzing(false);
    setPacingStatus(null);
    if (!stopRequestedRef.current) {
      showToast('All posts analyzed! Ready to comment on X.');
    }
  };

  // Regenerate single comment
  const handleRegenerate = async (id: string) => {
    const post = posts.find((p) => p.id === id);
    if (post) {
      const existing = posts
        .filter((p) => p.id !== id && p.generatedComment)
        .map((p) => p.generatedComment as string);
      const idx = posts.findIndex((p) => p.id === id);
      await analyzeSinglePost(post, selectedTone, idx >= 0 ? idx : 0, existing);
      showToast('New unique comment generated!');
    }
  };

  // Quick action: Comment next pending post
  const handleCommentNextPending = () => {
    const nextPost = posts.find((p) => p.status === 'ready' && !p.hasCommented);
    if (!nextPost || !nextPost.generatedComment) return;

    const comment = nextPost.generatedComment;
    navigator.clipboard.writeText(comment).catch(() => {});

    const intentUrl = nextPost.tweetId
      ? `https://x.com/intent/post?in_reply_to=${nextPost.tweetId}&text=${encodeURIComponent(comment)}`
      : `https://x.com/intent/post?text=${encodeURIComponent(comment)}`;

    window.open(intentUrl, '_blank', 'noopener,noreferrer');
    handleMarkCommented(nextPost.id);
    showToast(`Opening post on X! Comment copied to clipboard.`);
  };

  const readyCount = useMemo(
    () => posts.filter((p) => p.status === 'ready' || Boolean(p.generatedComment)).length,
    [posts]
  );
  const commentedCount = useMemo(
    () => posts.filter((p) => p.hasCommented).length,
    [posts]
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans flex flex-col">
      <Header
        totalCount={posts.length}
        readyCount={readyCount}
        commentedCount={commentedCount}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Intro banner */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
              <span>Batch Twitter/X Comment Assistant</span>
            </h2>
            <p className="text-xs text-zinc-600 max-w-2xl leading-relaxed">
              Paste up to 20 post links. Our AI parses each post context, generates tailored, high-converting comments, and provides a direct <strong>"Comment on X"</strong> button that opens the official reply composer with your comment ready to post.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono bg-zinc-50 p-2.5 rounded-xl border border-zinc-200 shrink-0">
            <span className="text-zinc-500">Supported:</span>
            <span className="font-semibold text-zinc-800">x.com & twitter.com</span>
          </div>
        </div>

        {/* Link Input Section */}
        <LinkInputSection
          rawInput={rawInput}
          onInputChange={handleInputChange}
          detectedCount={posts.length}
          onAnalyzeAll={handleAnalyzeAll}
          onStopAnalyzing={handleStopAnalyzing}
          isAnalyzing={isAnalyzing}
          pacingStatus={pacingStatus}
          onLoadSamples={handleLoadSamples}
          onClear={handleClear}
          selectedTone={selectedTone}
          onToneChange={setSelectedTone}
          userPersona={userPersona}
          onPersonaChange={setUserPersona}
        />

        {/* Progress & Stats Bar */}
        {posts.length > 0 && (
          <StatsBar
            posts={posts}
            onCommentNextPending={handleCommentNextPending}
          />
        )}

        {/* Posts List */}
        {posts.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-zinc-600" />
                <span>Detected Posts ({posts.length})</span>
              </h3>

              {isAnalyzing && analyzingIndex >= 0 && (
                <div className="text-xs text-zinc-600 flex items-center gap-2 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-900" />
                  <span>
                    Analyzing post {analyzingIndex + 1} of {posts.length}...
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {posts.map((post, idx) => (
                <PostCard
                  key={post.id}
                  post={post}
                  index={idx}
                  onUpdateComment={handleUpdateComment}
                  onUpdateTweetText={handleUpdateTweetText}
                  onRegenerate={handleRegenerate}
                  onRemove={handleRemovePost}
                  onMarkCommented={handleMarkCommented}
                  isProcessing={isAnalyzing && analyzingIndex === idx}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 mx-auto flex items-center justify-center text-zinc-500">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900">
              No Twitter / X links added yet
            </h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
              Paste your links in the box above (up to 20 links) or click "Load Sample Links" to test the comment generation workflow instantly.
            </p>
            <button
              id="empty-state-load-sample-btn"
              type="button"
              onClick={handleLoadSamples}
              className="text-xs font-medium bg-zinc-900 hover:bg-black text-white px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Load 3 Sample Posts</span>
            </button>
          </div>
        )}
      </main>

      {/* Footer with Creator and Donation Info */}
      <Footer />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-zinc-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg border border-zinc-700 animate-fade-in flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
