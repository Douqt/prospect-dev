"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { GridBackground } from "@/components/GridBackground";
import { PolygonChart } from "@/components/PolygonChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, MessageSquare, Users, TrendingUp, Clock, BarChart3, Zap, Star, Calendar } from "lucide-react";
import Link from "next/link";

interface Discussion {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  image_url?: string;
  profiles: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
  _count: {
    comments: number;
  };
}

export default function CryptoPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [feedType, setFeedType] = useState<'for-you' | 'following'>('for-you');

  const { data: discussions, isLoading, error } = useQuery({
    queryKey: ["discussions", "crypto", feedType],
    queryFn: async () => {
      console.log(`Fetching discussions for ${feedType} feed...`);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (feedType === 'following' && user) {
        // For "Following" feed: only show posts from followed users
        // First get users the current user is following
        const { data: followingData, error: followError } = await supabase
          .from("community_memberships")
          .select("user_id")
          .eq("user_id", user.id);

        if (followError) {
          console.error("Error fetching following data:", followError);
          // Return empty array if following data can't be fetched
          return [];
        }

        const followedUserIds = followingData?.map(f => f.user_id) || [];

        if (followedUserIds.length === 0) {
          // If user follows no one, return empty array
          return [];
        }

        // Fetch discussions only from followed users
        const { data, error } = await supabase
          .from("discussions")
          .select("id, title, content, category, created_at, upvotes, downvotes, comment_count, user_id, image_url")
          .eq("main_category", "crypto")
          .in("user_id", followedUserIds)
          .order("created_at", { ascending: false })
          .limit(20);

        console.log("Following discussions result:", data);
        if (error) throw error;

        // Fetch profiles separately
        if (!data || data.length === 0) return [];

        const discussionsWithProfiles = await Promise.all(
          data.map(async (discussion) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("username, display_name, avatar_url")
              .eq("id", discussion.user_id)
              .single();

            return {
              ...discussion,
              profiles: profile || { username: null, display_name: null, avatar_url: null },
              _count: {
                comments: discussion.comment_count || 0
              }
            };
          })
        );

        return discussionsWithProfiles as Discussion[];

      } else {
        // For "For You" feed: show all crypto discussions
        const { data, error } = await supabase
          .from("discussions")
          .select("id, title, content, category, created_at, upvotes, downvotes, comment_count, user_id, image_url")
          .eq("main_category", "crypto")
          .order("created_at", { ascending: false })
          .limit(20);

        console.log("For You crypto discussions result:", data);
        console.log("For You crypto discussions error:", error);

        if (error) throw error;

        // Fetch profiles separately
        if (!data || data.length === 0) return [];

        const discussionsWithProfiles = await Promise.all(
          data.map(async (discussion) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("username, display_name, avatar_url")
              .eq("id", discussion.user_id)
              .single();

            return {
              ...discussion,
              profiles: profile || { username: null, display_name: null, avatar_url: null },
              _count: {
                comments: discussion.comment_count || 0
              }
            };
          })
        );

        return discussionsWithProfiles as Discussion[];
      }
    }
  });

  // Filter discussions based on search query
  const filteredDiscussions = discussions?.filter(discussion =>
    searchQuery === "" ||
    discussion.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    discussion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    discussion.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

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

      <main className="relative z-10 pt-24 ml-[300px] mr-6 flex justify-center">
        {/* Social Media Style Feed */}
        <div className="w-full max-w-5xl">
          {/* Header with Search */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold mb-2">Crypto Feed</h1>
                <p className="text-muted-foreground">
                  Follow crypto traders and markets in real-time
                </p>
              </div>
              <Badge variant="secondary" className="bg-[#e0a815]/10 text-[#e0a815]">
                All Crypto Forums
              </Badge>
            </div>

            {/* Feed Type Buttons and Search */}
            <div className="flex items-center gap-6 mb-4">
              <div className="flex gap-2">
                <Button
                  variant={feedType === 'for-you' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFeedType('for-you')}
                  className="text-sm font-semibold"
                >
                  For You
                </Button>
                <Button
                  variant={feedType === 'following' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFeedType('following')}
                  className="text-sm font-semibold"
                >
                  Following
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts by crypto, trader, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-lg py-3"
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Card className="mb-8 border-red-500 bg-red-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-red-800">Database Error</h3>
                <p className="text-red-600 text-sm mt-2">
                  Unable to load discussions. Check browser console for details.
                </p>
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer text-red-600">Error Details</summary>
                  <pre className="text-xs mt-2 p-2 bg-red-100 rounded overflow-x-auto">
                    {JSON.stringify(error, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          )}

          {/* Social Feed Posts */}
          <div className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-muted-foreground">Loading discussions...</div>
              </div>
            ) : filteredDiscussions.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="mb-4">
                    <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                      {searchQuery ? "No matching posts" : feedType === 'following' ? "No posts from followed forums yet" : "No posts yet"}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery
                        ? "Try adjusting your search terms"
                        : feedType === 'following'
                        ? "Start following traders to see their posts here"
                        : "Be the first to post in our trading community"
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredDiscussions.map((discussion) => (
                <Card key={discussion.id} className="border hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    {/* Social Post Layout */}
                    <div className="flex gap-6">
                      {/* Post Content - Left Side */}
                      <div className="flex-1">
                        {/* User Info */}
                        <div className="flex items-center gap-3 mb-3">
                          <Link href={`/profile/${discussion.profiles?.username || ''}`}>
                            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 cursor-pointer hover:opacity-80 transition-opacity">
                              {discussion.profiles?.avatar_url ? (
                                <img
                                  src={discussion.profiles.avatar_url}
                                  alt={`${discussion.profiles.display_name || discussion.profiles.username || 'Trader'} avatar`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-white text-sm font-semibold">
                                  {discussion.profiles?.display_name?.charAt(0)?.toUpperCase() ||
                                   discussion.profiles?.username?.charAt(0)?.toUpperCase() ||
                                   'T'}
                                </span>
                              )}
                            </div>
                          </Link>
                          <div>
                            <Link href={`/profile/${discussion.profiles?.username || ''}`}>
                              <p className="font-semibold text-sm cursor-pointer hover:text-[#e0a815] transition-colors">
                                {discussion.profiles?.display_name || discussion.profiles?.username || 'Trader'}
                              </p>
                            </Link>
                            <Badge variant="outline" className="text-xs">
                              <Link href={`/crypto/${discussion.category.toLowerCase()}`}>
                                {discussion.category.toUpperCase()} Trader
                              </Link>
                            </Badge>
                          </div>
                        </div>

                        {/* Post Content */}
                        <div className="mb-4">
                          <Link href={`/crypto/${discussion.category.toLowerCase()}/${discussion.id}`}>
                            <h3 className="font-semibold text-lg mb-2 hover:text-[#e0a815] transition-colors cursor-pointer">
                              {discussion.title}
                            </h3>
                          </Link>
                          <div className="text-muted-foreground mb-3">
                            {/* Render image if image_url exists */}
                            {discussion.image_url && (
                              <div className="mb-3">
                                <img
                                  src={discussion.image_url}
                                  alt="Post image"
                                  className="rounded-lg max-w-full h-auto max-h-96 object-cover border border-gray-200"
                                  onLoad={() => console.log('✅ Image loaded successfully:', discussion.image_url)}
                                  onError={(e) => {
                                    console.log('❌ Image failed to load:', discussion.image_url);
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}

                            {/* Render text content */}
                            {discussion.content.split('\n').map((paragraph, index) => (
                              paragraph.trim() ? (
                                <p key={index} className="mb-2 last:mb-0">
                                  {paragraph}
                                </p>
                              ) : null
                            ))}
                          </div>
                        </div>

                        {/* Engagement Stats */}
                        <div className="flex items-center gap-6">
                          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-blue-600 transition-colors">
                            <MessageSquare className="w-4 h-4" />
                            {discussion.comment_count}
                          </button>
                          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-green-600 transition-colors">
                            <TrendingUp className="w-4 h-4" />
                            {discussion.upvotes - discussion.downvotes}
                          </button>
                          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-red-500 transition-colors">
                            ❤️ {discussion.upvotes}
                          </button>
                        </div>
                      </div>

                      {/* Chart - Right Side */}
                      <div className="flex-none w-80">
                        <Card className="p-3">
                          <div className="text-center mb-2">
                            <h4 className="font-semibold text-xs text-muted-foreground">
                              {discussion.category.toUpperCase()} Chart
                            </h4>
                          </div>
                          <div className="h-40 overflow-hidden">
                            <PolygonChart
                              symbol={discussion.category}
                            />
                          </div>
                        </Card>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>


      </main>
    </div>
  );
}
