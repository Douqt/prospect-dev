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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function VideosStudio() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

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
    fetchVideos();
  };

  const handleRetry = () => {
    fetchVideos();
  };

  const canUpload = !!currentUser;

  // Calculate analytics
  const totalViews = videos.reduce((sum, video) => sum + video.views, 0);
  const totalLikes = videos.reduce((sum, video) => sum + video.likes, 0);
  const totalVideos = videos.length;
  const recentVideos = videos.filter(v => {
    const daysSinceUpload = (Date.now() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpload <= 7;
  }).length;

  if (error) {
    const isDatabaseError = error.includes('Database not initialized') || error.includes('migration');

    return (
      <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
        <Sidebar />
        <div className="absolute inset-0 z-0 pointer-events-none grid-background" style={{
          backgroundImage: `linear-gradient(to right, rgba(128, 128, 128, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(128, 128, 128, 0.2) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }} />
        <Navbar />

        <main className="relative z-10 pt-20 sm:pt-24 pl-16 sm:pl-64 pr-3 sm:pr-6">
          <div className="max-w-7xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
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
                <button onClick={handleRetry} className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                  Try Again
                </button>
                {isDatabaseError && (
                  <button onClick={() => window.location.href = '/'} className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-colors">
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
        <div className="absolute inset-0 z-0 pointer-events-none grid-background" style={{
          backgroundImage: `linear-gradient(to right, rgba(128, 128, 128, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(128, 128, 128, 0.2) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }} />
        <Navbar />

        <main className="relative z-10 pt-20 sm:pt-24 pl-16 sm:pl-64 pr-3 sm:pr-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl sm:text-4xl font-bold mb-2">Studio</h1>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Manage your channel and videos like a pro
                  </p>
                </div>

                {canUpload ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleVideoUpload}
                    className="bg-primary text-primary-foreground px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm sm:text-base self-start sm:self-auto"
                  >
                    Upload Video
                  </motion.button>
                ) : (
                  <div className="text-sm text-muted-foreground self-start sm:self-auto">
                    Please login to manage videos
                  </div>
                )}
              </div>
            </motion.div>

            {/* Channel Info */}
            {currentUser && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={currentUser.avatar_url} />
                        <AvatarFallback className="text-xl">
                          {currentUser.display_name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold">{currentUser.display_name}</h2>
                        <p className="text-muted-foreground">@{currentUser.username}</p>
                        <div className="flex gap-4 mt-2">
                          <Badge variant="secondary">{totalVideos} videos</Badge>
                          <Badge variant="secondary">{totalViews.toLocaleString()} views</Badge>
                          <Badge variant="secondary">{totalLikes} likes</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="videos">Videos</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
                      <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalVideos}</div>
                      <p className="text-xs text-muted-foreground">+{recentVideos} this week</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                      <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
                      <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalLikes}</div>
                      <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
                      <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">0</div>
                      <p className="text-xs text-muted-foreground">Coming soon</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Videos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VideoGrid
                      videos={videos.slice(0, 10)}
                      loading={loading}
                      searchQuery={searchQuery}
                      onVideoSelect={handleVideoSelect}
                      showGhostOnEmpty={false}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="videos" className="space-y-6">
                <VideoGrid
                  videos={videos}
                  loading={loading}
                  searchQuery={searchQuery}
                  onVideoSelect={handleVideoSelect}
                  isStudio={true}
                  showGhostOnEmpty={false}
                />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Views Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        Analytics chart coming soon
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top Performing Videos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {videos.slice(0, 5).map((video, index) => (
                          <div key={video.id} className="flex items-center gap-3">
                            <div className="text-sm font-medium text-muted-foreground w-6">#{index + 1}</div>
                            <div className="flex-1">
                              <p className="text-sm font-medium truncate">{video.title}</p>
                              <p className="text-xs text-muted-foreground">{video.views} views</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Channel Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Channel Name</label>
                        <p className="text-sm text-muted-foreground">{currentUser?.display_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Channel URL</label>
                        <p className="text-sm text-muted-foreground">@{currentUser?.username}</p>
                      </div>
                      <Button variant="outline">Edit Channel</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
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
