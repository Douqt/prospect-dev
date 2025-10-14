"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { PolygonChart } from "@/components/PolygonChart";
import { fetchMultiplePolygonData } from "@/lib/polygon-cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DiscussionVotes } from "@/components/discussions/DiscussionVotes";
import { Search, MessageSquare, Users, TrendingUp, Clock, BarChart3, Zap, Star, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
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

interface ForumStats {
  price: string;
  change: string;
  changeColor: string;
  posts: string;
  members: string;
}

export default function StocksPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [feedType, setFeedType] = useState<'for-you' | 'following'>('for-you');
  const [symbolList] = useState(['NVDA', 'AAPL', 'MSFT', 'TSLA', 'GOOGL', 'AMZN']); // Preload common symbols

  // Preload charts for feed optimization on component mount
  useEffect(() => {
    const preloadCharts = async () => {
      try {
        console.log('🔥 Preloading charts for stock feed symbols...');
        // Batch load charts for common feed symbols to warm cache
        await fetchMultiplePolygonData(symbolList, '1m', 6); // Load up to 6 symbols per batch
        console.log('✅ Feed charts preloaded');
      } catch (error) {
        console.warn('⚠️ Chart preload warning (non-blocking):', error);
      }
    };

    if (symbolList.length > 0) {
      preloadCharts();
    }
  }, [symbolList]);

  // Fetch top community stats
  const topSymbols = ['NVDA', 'AAPL', 'MSFT', 'TSLA'];
  const { data: topCommunitiesData, isLoading: topCommunitiesLoading } = useQuery({
    queryKey: ["top-communities"],
    queryFn: async () => {
      const results = await Promise.all(
        topSymbols.map(async (symbol) => {
          try {
            const response = await fetch(`/api/forum-stats?symbol=${symbol}`);
            if (!response.ok) throw new Error(`Failed to fetch ${symbol} stats`);
            const data: ForumStats = await response.json();
            return { symbol, ...data };
          } catch (error) {
            console.error(`Error fetching stats for ${symbol}:`, error);
            return {
              symbol,
              price: "Loading...",
              change: "Loading...",
              changeColor: "text-gray-600",
              posts: "0",
              members: "0"
            };
          }
        })
      );
      return results;
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const { data: discussions, isLoading, error } = useQuery({
    queryKey: ["discussions", "stocks", feedType],
    queryFn: async () => {
      console.log(`Fetching discussions for ${feedType} feed...`);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (feedType === 'following' && user) {
        // For "Following" feed: only show posts from followed forums
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

        // Fetch discussions only from followed forums
        const { data, error } = await supabase
          .from("discussions")
          .select("id, title, content, category, created_at, upvotes, downvotes, comment_count, user_id, image_url")
          .eq("main_category", "stocks")
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
        // For "For You" feed: show all stock discussions
        const { data, error } = await supabase
          .from("discussions")
          .select("id, title, content, category, created_at, upvotes, downvotes, comment_count, user_id, image_url")
          .eq("main_category", "stocks")
          .order("created_at", { ascending: false })
          .limit(20);

        console.log("For You stock discussions result:", data);
        console.log("For You stock discussions error:", error);

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
    <div className="min-h-screen bg-background relative text-foreground">
      <Sidebar />
      <div
        className="absolute inset-0 z-0 pointer-events-none grid-background"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(128, 128, 128, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(128, 128, 128, 0.2) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />
      <Navbar />

      <main className="relative z-10 pt-24">
        <div className="flex max-w-7xl mx-auto px-6">
          {/* Main Feed - Centered */}
          <div className="flex-1 max-w-4xl mx-auto">
          {/* Header with Search */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold mb-2">Stock Feed</h1>
                <p className="text-muted-foreground">
                  Follow stock traders and markets in real-time
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
          <div className="space-y-8">
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
              filteredDiscussions.map((discussion) => {
                const userDisplayName = discussion.profiles?.display_name || discussion.profiles?.username || "Anonymous";
                const timeAgo = formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true });

                return (
                  <Link key={discussion.id} href={`/stocks/${discussion.category.toLowerCase()}/${discussion.id}`}>
                    <Card className="border-0 bg-card hover:shadow-lg transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <DiscussionVotes
                            discussionId={discussion.id}
                            upvotes={discussion.upvotes}
                            downvotes={discussion.downvotes}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const username = discussion.profiles?.username;
                                  if (username) {
                                    router.push(`/profile/${username}`);
                                  }
                                }}
                                className="hover:opacity-80 transition-opacity"
                              >
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={discussion.profiles?.avatar_url} />
                                  <AvatarFallback>
                                    {userDisplayName[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const username = discussion.profiles?.username;
                                  if (username) {
                                    router.push(`/profile/${username}`);
                                  }
                                }}
                                className="hover:underline text-sm text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <span className="font-medium">{userDisplayName}</span>
                              </button>
                              <span className="text-sm text-muted-foreground">•</span>
                              <span className="text-sm text-muted-foreground">{timeAgo}</span>
                            </div>

                            <h3 className="text-xl font-semibold mb-2 cursor-pointer hover:text-[#e0a815] transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `/stocks/${discussion.category.toLowerCase()}/${discussion.id}`;
                                }}>
                              {discussion.title}
                            </h3>

                            <div className="text-muted-foreground mb-4 whitespace-pre-wrap">
                              {discussion.content}
                            </div>

                            <div className="flex items-center gap-6">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MessageSquare className="w-4 h-4" />
                                <span>{discussion.comment_count} comments</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <TrendingUp className="w-4 h-4" />
                                <span>{discussion.upvotes - discussion.downvotes} points</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>❤️ {discussion.upvotes}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>
          </div>

          {/* Top Communities Sidebar - Right Side */}
          <div className="w-96 pl-8 border-l border-border">
            <div className="sticky top-6">
              <h2 className="text-xl font-semibold mb-4">Top Communities</h2>
              <div className="space-y-4">
                {topCommunitiesLoading ? (
                  topSymbols.map((symbol) => (
                    <Card key={symbol} className="text-center opacity-50">
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-[#e0a815]">Loading...</div>
                        <div className="text-sm text-muted-foreground">{symbol} Price</div>
                        <div className="text-gray-600 text-sm">Loading...</div>
                        <div className="text-xs text-muted-foreground mt-1">Loading members • Loading posts</div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  topCommunitiesData?.map((community) => (
                    <Card key={community.symbol} className="text-center">
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-[#e0a815]">{community.price}</div>
                        <div className="text-sm text-muted-foreground">{community.symbol} Price</div>
                        <div className={`${community.changeColor} text-sm`}>{community.change}</div>
                        <div className="text-xs text-muted-foreground mt-1">{community.members} members • {community.posts} posts</div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
