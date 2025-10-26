"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import VideoGrid from "@/components/videos/VideoGrid";
import VideoPlayer from "@/components/videos/VideoPlayer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Video, User } from "@/types/videos";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ChannelPageProps {
  username: string;
}

export default function ChannelPage({ username }: ChannelPageProps) {
  const [channelUser, setChannelUser] = useState<User | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("videos");

  useEffect(() => {
    fetchChannelData();
    fetchCurrentUser();
  }, [username]);

  const fetchChannelData = async () => {
    try {
      setLoading(true);
      setError(null);

      let profileData;

      if (username === 'current') {
        // Fetch current user's profile
        const profileResponse = await fetch('/api/profile?userId=current');
        if (!profileResponse.ok) {
          throw new Error('Please login to view your channel');
        }
        profileData = await profileResponse.json();
      } else {
        // Fetch user profile by username (public access)
        const profileResponse = await fetch(`/api/profile?username=${encodeURIComponent(username)}`);
        if (!profileResponse.ok) {
          throw new Error('Channel not found');
        }
        profileData = await profileResponse.json();
      }

      setChannelUser(profileData.profile);

      // Fetch user's videos (public access)
      const videosResponse = await fetch(`/api/videos?creator_id=${encodeURIComponent(profileData.profile.id)}`);
      if (videosResponse.ok) {
        const videosData = await videosResponse.json();
        setVideos(videosData.videos || []);
      }
    } catch (error) {
      console.error("Error fetching channel data:", error);
      setError(error instanceof Error ? error.message : "Failed to load channel");
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
      // If not authenticated, currentUser remains null (which is fine for public channel viewing)
    } catch (error) {
      console.error("Error fetching current user:", error);
      // Not authenticated, which is fine for public channel viewing
    }
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
  };

  const isOwnChannel = currentUser?.id === channelUser?.id;

  // Calculate channel stats
  const totalViews = videos.reduce((sum, video) => sum + video.views, 0);
  const totalLikes = videos.reduce((sum, video) => sum + video.likes, 0);
  const totalVideos = videos.length;

  if (error) {
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
              <h2 className="text-xl font-semibold mb-2">Channel Not Found</h2>
              <p className="text-muted-foreground mb-6">The channel you're looking for doesn't exist or may have been removed.</p>
              <Button onClick={() => window.location.href = '/videos'}>
                Back to Videos
              </Button>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  if (loading || !channelUser) {
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
            <div className="animate-pulse space-y-6">
              {/* Channel Header Skeleton */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 bg-muted rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-6 bg-muted rounded w-48"></div>
                  <div className="h-4 bg-muted rounded w-32"></div>
                </div>
              </div>
              {/* Video Grid Skeleton */}
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
            </div>
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
            {/* Channel Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={channelUser.avatar_url} />
                      <AvatarFallback className="text-2xl">
                        {channelUser.display_name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h1 className="text-3xl font-bold mb-1">{channelUser.display_name}</h1>
                          <p className="text-muted-foreground mb-2">@{channelUser.username}</p>
                          <div className="flex gap-4">
                            <Badge variant="secondary">{totalVideos} videos</Badge>
                            <Badge variant="secondary">{totalViews.toLocaleString()} views</Badge>
                            <Badge variant="secondary">{totalLikes} likes</Badge>
                          </div>
                        </div>
                        {isOwnChannel && (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              Customize Channel
                            </Button>
                            <Button variant="outline" size="sm">
                              Manage Videos
                            </Button>
                          </div>
                        )}
                      </div>
                      {channelUser.bio && (
                        <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
                          {channelUser.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Channel Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="videos">Videos</TabsTrigger>
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="community">Community</TabsTrigger>
              </TabsList>

              <TabsContent value="videos" className="space-y-6">
                <VideoGrid
                  videos={videos}
                  loading={loading}
                  searchQuery=""
                  onVideoSelect={handleVideoSelect}
                  currentUser={currentUser}
                  showLoadingSkeletons={false}
                  showGhostOnEmpty={false}
                />
              </TabsContent>

              <TabsContent value="about" className="space-y-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">About</h3>
                        <p className="text-muted-foreground">
                          {channelUser.bio || 'No description available.'}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{totalVideos}</div>
                          <div className="text-sm text-muted-foreground">Videos</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{totalViews.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Total Views</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">0</div>
                          <div className="text-sm text-muted-foreground">Subscribers</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="community" className="space-y-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <h3 className="text-lg font-medium mb-2">Community</h3>
                      <p className="text-muted-foreground">Community features coming soon!</p>
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
      </div>
    </ErrorBoundary>
  );
}
