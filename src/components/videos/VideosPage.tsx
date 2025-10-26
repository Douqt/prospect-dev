"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import VideoGrid from "./VideoGrid";
import VideoPlayer from "./VideoPlayer";
import VideoUploadModal from "./VideoUploadModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Video, User } from "@/types/videos";

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
    fetchCurrentUser();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/videos");
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 503) {
          throw new Error(errorData.message || "Database not initialized");
        } else {
          throw new Error(`Failed to fetch videos: ${response.status} - ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
      setError(error instanceof Error ? error.message : "Failed to load videos");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/profile?userId=current");
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.profile);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      // Don't set error state for user fetch failures - it's not critical
    }
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
  };

  const handleVideoUpload = () => {
    setShowUploadModal(true);
  };

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    fetchVideos(); // Refresh the video list
  };

  const handleRetry = () => {
    fetchVideos();
  };

  const canUpload = !!currentUser; // Any authenticated user can upload

  if (error) {
    const isDatabaseError = error.includes('Database not initialized') || error.includes('migration');

    return (
      <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
        <Sidebar />
        <div
          className="absolute inset-0 z-0 pointer-events-none grid-background"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(128, 128, 128, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(128, 128, 128, 0.2) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
        <Navbar />

        <main className="relative z-10 pt-20 sm:pt-24 pl-16 sm:pl-64 pr-3 sm:pr-6">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">
                {isDatabaseError ? 'Setup Required' : 'Failed to load videos'}
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">{error}</p>

              {isDatabaseError && (
                <div className="bg-muted/50 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
                  <h3 className="font-medium mb-2">To fix this issue:</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>1. Open your terminal in the project directory</p>
                    <p>2. Run: <code className="bg-background px-2 py-1 rounded text-xs">npx supabase migration up</code></p>
                    <p>3. Or run: <code className="bg-background px-2 py-1 rounded text-xs">npx supabase db reset</code></p>
                    <p>4. Refresh this page</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Try Again
                </button>
                {isDatabaseError && (
                  <button
                    onClick={() => window.location.href = '/'}
                    className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
                  >
                    Go Home
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
        <Sidebar />
        <div
          className="absolute inset-0 z-0 pointer-events-none grid-background"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(128, 128, 128, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(128, 128, 128, 0.2) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
        <Navbar />

        <main className="relative z-10 pt-20 sm:pt-24 pl-16 sm:pl-64 pr-3 sm:pr-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 sm:mb-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl sm:text-4xl font-bold mb-2">Videos</h1>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Discover and watch educational content from our community
                  </p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                  {canUpload && (
                    <motion.a
                      href="/studio"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg font-medium hover:bg-secondary/80 transition-colors text-sm flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Studio
                    </motion.a>
                  )}
                  {currentUser && videos.length === 0 && !loading && (
                    <motion.a
                      href={`/channel/${currentUser.username}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Go to Channel
                    </motion.a>
                  )}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-md">
                <input
                  type="text"
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-12 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm sm:text-base"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </motion.div>

            {/* Video Grid */}
            <VideoGrid
              videos={videos}
              loading={loading}
              searchQuery={searchQuery}
              onVideoSelect={handleVideoSelect}
              currentUser={currentUser}
              showLoadingSkeletons={true}
              showGhostOnEmpty={true}
            />
          </div>
        </main>

        {/* Video Player Modal */}
        {selectedVideo && (
          <VideoPlayer
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
            currentUser={currentUser}
          />
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <VideoUploadModal
            onClose={() => setShowUploadModal(false)}
            onSuccess={handleUploadSuccess}
            currentUser={currentUser}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
