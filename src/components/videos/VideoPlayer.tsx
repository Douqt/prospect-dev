"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, User, Comment } from "@/types/videos";
import { formatDistanceToNow } from "date-fns";
import { getMuxPlaybackUrl } from "@/lib/mentor-marketplace/mux-api";

interface VideoPlayerProps {
  video: Video;
  onClose: () => void;
  currentUser: User | null;
}

export default function VideoPlayer({ video, onClose, currentUser }: VideoPlayerProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isLiked, setIsLiked] = useState(video.is_liked || false);
  const [likesCount, setLikesCount] = useState(video.likes || 0);
  const [viewIncremented, setViewIncremented] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Increment view count when video starts playing
  useEffect(() => {
    if (!viewIncremented && videoRef.current) {
      const handlePlay = async () => {
        if (!viewIncremented) {
          try {
            await fetch(`/api/videos/${video.id}/view`, {
              method: 'POST',
            });
            setViewIncremented(true);
          } catch (error) {
            console.error('Error incrementing view count:', error);
          }
        }
      };

      videoRef.current.addEventListener('play', handlePlay);
      return () => {
        videoRef.current?.removeEventListener('play', handlePlay);
      };
    }
  }, [video.id, viewIncremented]);

  // Fetch comments
  useEffect(() => {
    fetchComments();
  }, [video.id]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const response = await fetch(`/api/videos/${video.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleLike = async () => {
    try {
      const response = await fetch(`/api/videos/${video.id}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.action === 'liked');
        setLikesCount(prev => data.action === 'liked' ? prev + 1 : prev - 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    setSubmittingComment(true);
    try {
      const response = await fetch(`/api/videos/${video.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => [data.comment, ...prev]);
        setNewComment("");
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M views`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K views`;
    }
    return `${views} views`;
  };

  const playbackUrl = getMuxPlaybackUrl(video.mux_playback_id);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm"
        onClick={onClose}
      >
        <div className="flex flex-col lg:flex-row h-full">
          {/* Video Section */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10">
              <h1 className="text-white text-base sm:text-lg font-semibold truncate mr-2 sm:mr-4">
                {video.title}
              </h1>
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Video Player */}
            <div className="flex-1 flex items-center justify-center p-2 sm:p-4">
              <div className="w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full"
                  controls
                  poster={video.thumbnail_url}
                  preload="metadata"
                  playsInline
                >
                  <source src={playbackUrl} type="application/x-mpegURL" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>

            {/* Video Info */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleLike}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      isLiked
                        ? 'text-red-500 bg-red-500/10'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="text-sm">{likesCount}</span>
                  </button>

                  <div className="text-white/70 text-sm">
                    {formatViews(video.views)} • {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                  </div>
                </div>

                <button
                  onClick={() => setShowComments(!showComments)}
                  className="text-white/70 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Comments
                </button>
              </div>

              {/* Video Description */}
              <div className="text-white/90 text-sm leading-relaxed">
                {video.description}
              </div>

              {/* Tags */}
              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {video.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-white/10 text-white/70 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                className="w-full lg:w-96 bg-background border-l border-border flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Comments Header */}
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold">Comments</h3>
                </div>

                {/* Comment Form */}
                {currentUser && (
                  <div className="p-4 border-b border-border">
                    <form onSubmit={handleCommentSubmit}>
                      <div className="flex space-x-3">
                        <img
                          src={currentUser.avatar_url || '/placeholder.svg'}
                          alt={currentUser.display_name}
                          className="w-8 h-8 rounded-full"
                        />
                        <div className="flex-1">
                          <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="w-full bg-transparent border-none resize-none focus:outline-none text-sm"
                            rows={2}
                            maxLength={1000}
                          />
                          {newComment.trim() && (
                            <div className="flex justify-end mt-2">
                              <button
                                type="submit"
                                disabled={submittingComment}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                              >
                                {submittingComment ? 'Posting...' : 'Comment'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto">
                  {loadingComments ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Loading comments...
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No comments yet. Be the first to comment!
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {comments.map((comment) => (
                        <div key={comment.id} className="p-4 hover:bg-muted/50">
                          <div className="flex space-x-3">
                            <img
                              src={comment.user.avatar_url || '/placeholder.svg'}
                              alt={comment.user.display_name}
                              className="w-8 h-8 rounded-full"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-sm">
                                  {comment.user.display_name || comment.user.username}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-sm text-foreground mb-2">
                                {comment.content}
                              </p>
                              <div className="flex items-center space-x-4">
                                <button className="text-xs text-muted-foreground hover:text-foreground">
                                  Like
                                </button>
                                <button className="text-xs text-muted-foreground hover:text-foreground">
                                  Reply
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
