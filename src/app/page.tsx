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

// Mock data - in production this would come from your API
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

const topCommunities = [
  {
    symbol: "TSLA",
    name: "Tesla Inc",
    members: "0", // Will be updated with real data
    posts: "0", // Will be updated with real data
    change: "0%", // Will be updated with real data
    changeColor: "text-gray-600"
  },
  {
    symbol: "NVDA",
    name: "Nvidia",
    members: "0",
    posts: "0",
    change: "0%",
    changeColor: "text-gray-600"
  },
  {
    symbol: "AAPL",
    name: "Apple Inc",
    members: "0",
    posts: "0",
    change: "0%",
    changeColor: "text-gray-600"
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    members: "0",
    posts: "0",
    change: "0%",
    changeColor: "text-gray-600"
  }
];

const recentPosts = [
  {
    id: "1",
    title: "Q4 Earnings Analysis",
    author: "trader_pro",
    category: "NVDA",
    comments: 42,
    votes: 156,
    time: "1 hour ago"
  },
  {
    id: "2",
    title: "Market Outlook for 2024",
    author: "market_watcher",
    category: "GENERAL",
    comments: 28,
    votes: 89,
    time: "2 hours ago"
  },
  {
    id: "3",
    title: "Technical Analysis: Support Levels",
    author: "technical_guru",
    category: "TSLA",
    comments: 15,
    votes: 67,
    time: "3 hours ago"
  }
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [feedType, setFeedType] = useState<'for-you' | 'following'>('for-you');

  const { data: discussions, isLoading, error } = useQuery({
    queryKey: ["discussions", "dashboard", feedType],
    queryFn: async () => {
      console.log(`Fetching discussions for ${feedType} feed...`);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (feedType === 'following' && user) {
        // For "Following" feed: show posts from followed forums (users following the forum)
        // First get forums the current user is following
        const { data: followingData, error: followError } = await supabase
          .from("community_memberships")
          .select("community_symbol")
          .eq("user_id", user.id);

        if (followError) {
          console.error("Error fetching forum following data:", followError);
          // Return empty array if following data can't be fetched
          return [];
        }

        const followedForums = followingData?.map(f => f.community_symbol.toLowerCase()) || [];

        if (followedForums.length === 0) {
          // If user follows no forums, return empty array
          return [];
        }

        // Fetch discussions only from followed forums - don't limit main category
        const { data, error } = await supabase
          .from("discussions")
          .select("id, title, content, category, created_at, upvotes, downvotes, comment_count, user_id, image_url")
          .in("category", followedForums)
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
        // For "For You" feed: show all discussions
        const { data, error } = await supabase
          .from("discussions")
          .select("id, title, content, category, created_at, upvotes, downvotes, comment_count, user_id, image_url")
          .order("created_at", { ascending: false })
          .limit(20);

        console.log("For You discussions result:", data);
        console.log("For You discussions error:", error);

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

  const [stats, setStats] = useState({
    totalUsers: '1.2M+',
    activeDiscussions: '45.6K',
    dailyActive: '18.7K'
  });

  // Fetch real stats from your database
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // In production, fetch real statistics from your database
        // const response = await fetch('/api/stats');
        // const data = await response.json();
        // setStats(data);
      } catch (error) {
        console.log('Using default stats');
      }
    };

    fetchStats();
  }, []);

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
                <h1 className="text-4xl font-bold mb-2">Trading Feed</h1>
                <p className="text-muted-foreground">
                  Follow traders and markets in real-time
                </p>
              </div>
              <Badge variant="secondary" className="bg-[#e0a815]/10 text-[#e0a815]">
                All Forums
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
                placeholder="Search posts by stock, trader, or content..."
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
          <div className="border border-[#e0a815]/50 rounded-lg overflow-hidden">
            {isLoading ? (
              <Card className="text-center py-12 border-0 rounded-none">
                <CardContent>
                  <div className="mb-4">
                    <div className="text-muted-foreground">Loading trading feed...</div>
                  </div>
                </CardContent>
              </Card>
            ) : filteredDiscussions.length === 0 ? (
              <Card className="text-center py-12 border-0 rounded-none">
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
                        ? "Start following forums to see their discussions here"
                        : "Be the first to post in our trading community"
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredDiscussions.map((discussion, index) => (
                <div key={discussion.id}>
                  <Card className={`border-0 hover:shadow-md transition-all duration-200 border-b border-[#e0a815]/10 ${
                    index === 0 ? 'rounded-t-lg' :
                    index === filteredDiscussions.length - 1 ? 'rounded-b-lg' : 'rounded-none'
                  }`}>
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
                                    alt={(discussion.profiles?.display_name || discussion.profiles?.username || 'Trader') + ' avatar'}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-white text-sm font-semibold">
                                    {discussion.profiles?.display_name?.charAt(0)?.toUpperCase() ??
                                     discussion.profiles?.username?.charAt(0)?.toUpperCase() ??
                                     'T'}
                                  </span>
                                )}
                              </div>
                            </Link>
                            <div>
                              <Link href={`/profile/${discussion.profiles?.username || ''}`}>
                                <p className="font-semibold text-sm cursor-pointer hover:text-[#e0a815] transition-colors">
                                  {discussion.profiles?.display_name ?? discussion.profiles?.username ?? 'Trader'}
                                </p>
                              </Link>
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `/stocks/${discussion.category.toLowerCase()}`;
                                }}
                                className="cursor-pointer text-xs px-2 py-1 bg-muted rounded-md hover:bg-muted/80 transition-colors"
                              >
                                {discussion.category.toUpperCase()} Trader
                              </span>
                            </div>
                          </div>

                          {/* Post Content */}
                          <div className="mb-4">
                            <Link href={`/stocks/${discussion.category.toLowerCase()}/${discussion.id}`}>
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
                                symbol={discussion.category.toUpperCase()}
                                symbols={filteredDiscussions.map(d => d.category.toUpperCase())}
                                enableBatchLoading={true}
                              />
                            </div>
                          </Card>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))
            )}   
          </div>
          {/* End of feed message */}

          {!isLoading && filteredDiscussions.length > 0 && (
            <div className="text-center py-6 px-4">
              <div className="inline-flex items-center gap-2 bg-muted/30 px-4 py-2 rounded-full border border-[#e0a815]/50">
                <div className="w-1 h-1 bg-[#e0a815] rounded-full"></div>
                <p className="text-muted-foreground text-xs">You've reached the end of the feed</p>
                <div className="w-1 h-1 bg-[#e0a815] rounded-full"></div>
              </div>
            </div>
          )}

          {/* Add bottom spacing */}

          <div className="h-16"></div>
        </div>
      </main>
    </div>
  );
}
