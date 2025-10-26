"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import VideoCard from "./VideoCard";
import { Video, User } from "@/types/videos";

interface VideoGridProps {
  videos: Video[];
  loading: boolean;
  searchQuery: string;
  onVideoSelect: (video: Video) => void;
  isStudio?: boolean;
  currentUser?: User | null;
  showLoadingSkeletons?: boolean;
  showGhostOnEmpty?: boolean;
}

export default function VideoGrid({ videos, loading, searchQuery, onVideoSelect, isStudio, currentUser, showLoadingSkeletons = true, showGhostOnEmpty = true }: VideoGridProps) {
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [displayedVideos, setDisplayedVideos] = useState<Video[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filter videos based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredVideos(videos);
    } else {
      const filtered = videos.filter(video =>
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.creator.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.creator.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredVideos(filtered);
    }
  }, [videos, searchQuery]);

  // Reset displayed videos when filtered videos change
  useEffect(() => {
    setDisplayedVideos([]);
    setHasMore(true);
  }, [filteredVideos]);

  // Load more videos (simulate infinite scroll)
  const loadMoreVideos = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);

    // Simulate loading delay
    setTimeout(() => {
      const currentLength = displayedVideos.length;
      const nextVideos = filteredVideos.slice(currentLength, currentLength + 12);

      if (nextVideos.length === 0) {
        setHasMore(false);
      } else {
        setDisplayedVideos(prev => [...prev, ...nextVideos]);
      }

      setLoadingMore(false);
    }, 500);
  }, [filteredVideos, displayedVideos.length, loadingMore, hasMore]);

  // Initial load of videos
  useEffect(() => {
    if (filteredVideos.length > 0 && displayedVideos.length === 0) {
      const initialVideos = filteredVideos.slice(0, 12);
      setDisplayedVideos(initialVideos);
      setHasMore(filteredVideos.length > 12);
    }
  }, [filteredVideos, displayedVideos.length]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreVideos();
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMoreVideos]);

  if (loading && showLoadingSkeletons !== false) {
    return (
      <div className="grid grid-cols-5 gap-4 sm:gap-6">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-muted rounded-lg aspect-video mb-3"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredVideos.length === 0) {
    if (showGhostOnEmpty) {
      // Show ghost cards with overlay (for videos page)
      return (
        <div className="grid grid-cols-5 gap-4 sm:gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="relative">
              {/* Skeleton card structure */}
              <div className="animate-pulse">
                <div className="bg-muted rounded-lg aspect-video mb-3 relative overflow-hidden">
                  {/* Video thumbnail skeleton */}
                  <div className="absolute inset-0 bg-muted"></div>
                  {/* Overlay message */}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="text-center text-white">
                      <svg className="mx-auto h-8 w-8 mb-2 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs font-medium opacity-90">
                        {searchQuery ? 'No videos found' : 'No videos available'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    } else {
      // Show clean empty state (for studio and channel pages)
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="mx-auto h-16 w-16 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-muted-foreground">
            {searchQuery ? 'No videos found' : 'No videos'}
          </p>
        </div>
      );
    }
  }

  return (
    <div className="space-y-8">
      {/* Video Grid */}
      <motion.div
        layout
        className="grid grid-cols-5 gap-4 sm:gap-6"
      >
        {displayedVideos.map((video, index) => (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            layout
          >
            <VideoCard
              video={video}
              onClick={() => onVideoSelect(video)}
              isStudio={isStudio}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Load More / Infinite Scroll */}
      {hasMore && (
        <div className="flex justify-center">
          {loadingMore ? (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Loading more videos...</span>
            </div>
          ) : (
            <div id="scroll-sentinel" className="h-10 w-full"></div>
          )}
        </div>
      )}

      {/* End of Results */}
      {!hasMore && displayedVideos.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 text-muted-foreground"
        >
          <p>You've reached the end! 🎉</p>
        </motion.div>
      )}
    </div>
  );
}
