"use client";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { GridBackground } from "@/components/GridBackground";
import { DiscussionForum } from "@/components/discussions/DiscussionForum";
import { DiscussionList } from "@/components/discussions/DiscussionList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, MessageSquare, Users, TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PolygonChartDynamic } from "@/components/PolygonChartDynamic";
import { PolygonChart } from "@/components/PolygonChart";
import FollowForumButton from "@/components/FollowForumButton";
import { formatDistanceToNow } from "date-fns";
import { isCryptoForum, isFuturesForum } from "forum-categories";
import { useRouter } from "next/navigation";

interface CryptoData {
  symbol: string;
  name: string;
  price: string;
  change: string;
  changeColor: string;
  posts: number;
  members: string;
  description: string;
}

// Basic crypto metadata - only for display purposes when stats are loading
const getCryptoMetadata = (symbol: string) => {
  const upperSymbol = symbol.toUpperCase();
  return {
    symbol: upperSymbol,
    name: upperSymbol, // Will be updated with real data when available
    description: `Discussions about ${upperSymbol}`
  };
};

interface CryptoPageProps {
  params: Promise<{ symbol: string }>;
}

export default function CryptoPage({ params }: CryptoPageProps) {
  // Unwrap the params Promise - this is needed in Next.js 15
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ symbol: string } | null>(null);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const metadata = resolvedParams ? getCryptoMetadata(resolvedParams.symbol) : null;

  // Default crypto data with loading states for real-time data
  const fallbackCrypto: CryptoData = {
    symbol: metadata?.symbol || '',
    name: metadata?.name || '',
    price: "Loading...",
    change: "Loading...",
    changeColor: "text-gray-600",
    posts: 0,
    members: "Loading...",
    description: metadata?.description || ''
  };

  // Check if this crypto forum has any posts
  const { data: forumPosts } = useQuery({
    queryKey: ["forum-posts", resolvedParams?.symbol],
    queryFn: async () => {
      if (!resolvedParams?.symbol) return [];

      const { data, error } = await supabase
        .from("discussions")
        .select("id, title, content, created_at, upvotes, downvotes, comment_count, user_id")
        .eq("category", resolvedParams.symbol.toLowerCase())
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching forum posts:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!resolvedParams?.symbol
  });

  // Fetch real-time forum stats
  const { data: forumStats, isLoading: statsLoading } = useQuery({
    queryKey: ["forum-stats", resolvedParams?.symbol],
    queryFn: async () => {
      if (!resolvedParams?.symbol) return null;

      try {
        const response = await fetch(`/api/forum-stats?symbol=${resolvedParams.symbol.toUpperCase()}`);
        const data = await response.json();

        return data;
      } catch (error) {
        console.warn('Failed to fetch forum stats, using fallback:', error);
        // Fallback to basic stats if API fails
        return {
          price: "N/A",
          change: "N/A",
          changeColor: "text-gray-600",
          posts: 0,
          members: "0"
        };
      }
    },
    enabled: !!resolvedParams?.symbol,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch posts specifically for this forum (like crypto page)
  const { data: forumDiscussions, isLoading: discussionsLoading } = useQuery({
    queryKey: ["forum-discussions", resolvedParams?.symbol],
    queryFn: async () => {
      if (!resolvedParams?.symbol) return [];

      const { data, error } = await supabase
        .from("discussions")
        .select("id, title, content, category, created_at, upvotes, downvotes, comment_count, user_id, image_url")
        .eq("category", resolvedParams.symbol.toLowerCase())
        .order("created_at", { ascending: false })
        .limit(20);

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

      return discussionsWithProfiles;
    },
    enabled: !!resolvedParams?.symbol
  });

  // Use real stats if available, otherwise show loading
  const displayCrypto = forumStats ? { ...fallbackCrypto, ...forumStats } : fallbackCrypto;

  // Always show the forum page, even if it has no posts yet

  if (!resolvedParams) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
        <Sidebar />
        <GridBackground />
        <Navbar />
        <main className="relative z-10 pt-24 pl-64 pr-6">
          <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
            <div className="text-muted-foreground">Loading forum...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      <Sidebar />
      <GridBackground />
      <Navbar />

      <div className="flex">
        {/* Main Content - Left Side */}
        <main className="flex-1 relative z-10 pt-24 pl-64 pr-0">
          <div className="max-w-6xl mx-auto p-6">
            {/* Back Button */}
            <Link href="/crypto" className="inline-flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Crypto
            </Link>

            {/* Crypto Header */}
            <div className="mb-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#e0a815]/10 to-[#f2c74b]/10 border border-[#e0a815]/20 flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-[#e0a815]" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-4xl font-bold">{displayCrypto.symbol}</h1>
                  <p className="text-muted-foreground text-lg">{displayCrypto.name}</p>
                  <p className="text-muted-foreground">{displayCrypto.description}</p>
                </div>
              </div>

              {/* Crypto Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-[#e0a815]">{displayCrypto.price}</div>
                    <div className="text-xs text-muted-foreground">Current Price</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className={`text-2xl font-bold ${displayCrypto.changeColor}`}>{displayCrypto.change}</div>
                    <div className="text-xs text-muted-foreground">Change</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{displayCrypto.posts.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Posts</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{displayCrypto.members}</div>
                    <div className="text-xs text-muted-foreground">Members</div>
                  </CardContent>
                </Card>
              </div>
            </div>



            {/* Follow Forum Button */}
            <FollowForumButton stockSymbol={resolvedParams.symbol.toLowerCase()} />

            {/* Discussion Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <MessageSquare className="h-6 w-6 text-[#e0a815]" />
                  {displayCrypto.symbol} Discussions
                  <Badge variant="secondary" className="ml-2">Forum Activity</Badge>
                </CardTitle>
                <p className="text-muted-foreground">
                  Join fellow traders discussing {displayCrypto.name}
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <DiscussionForum category={resolvedParams.symbol.toLowerCase()} />
              </CardContent>
            </Card>

            {/* Discussion Section */}
            <div className="pt-6">
              {/* Social Feed Posts */}
              <div className="border border-[#e0a815]/50 rounded-lg overflow-hidden">
                {discussionsLoading ? (
                  <Card className="text-center py-12 border-0 rounded-none">
                    <CardContent>
                      <div className="mb-4">
                        <div className="text-muted-foreground">Loading {resolvedParams.symbol.toUpperCase()} discussions...</div>
                      </div>
                    </CardContent>
                  </Card>
                ) : forumDiscussions && forumDiscussions.length === 0 ? (
                  <Card className="text-center py-12 border-0 rounded-none">
                    <CardContent>
                      <div className="mb-4">
                        <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No discussions yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Be the first to start a conversation about {resolvedParams.symbol.toUpperCase()}!
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  forumDiscussions?.map((discussion, index) => {
                    const userDisplayName = discussion.profiles?.display_name || discussion.profiles?.username || "Anonymous";
                    const timeAgo = formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true });

                    return (
                      <div key={discussion.id}>
                        {index > 0 && (
                          <div className="h-px bg-[#e0a815]/30 w-full"></div>
                        )}
                        <Card
                          className={`border-0 transition-all duration-200 cursor-pointer
                          ${index === 0 ? 'rounded-t-lg' :
                            index === forumDiscussions.length - 1 ? 'rounded-b-lg' : 'rounded-none'}
                          group hover:bg-gray-800 hover:shadow-md [&:has(.chart:hover)]:bg-card text-card-foreground shadow-sm`}
                          onClick={() => {
                            const category = discussion.category.toUpperCase();
                            const routerPath = isCryptoForum(category) ? '/crypto' : isFuturesForum(category) ? '/futures' : '/stocks';
                            router.push(`${routerPath}/${discussion.category.toLowerCase()}/${discussion.id}`);
                          }}
                        >
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
                                    <span className="text-xs px-2 py-1 bg-muted rounded-md">
                                      {discussion.category.toUpperCase()}
                                    </span>
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
                                          className="rounded-lg max-w-full h-auto max-h-96 object-cover"
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
                              <div className="chart flex-none w-80 relative z-10 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                                <Card className="p-3 pointer-events-auto">
                                  <div className="text-center mb-2">
                                    <h4 className="font-semibold text-xs text-muted-foreground">
                                      {discussion.category.toUpperCase()} Chart
                                    </h4>
                                  </div>
                                  <div className="h-40 overflow-hidden">
                                    <PolygonChart
                                      symbol={discussion.category.toUpperCase()}
                                    />
                                  </div>
                                </Card>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })
                )}

                {/* End of feed message */}
                
              </div>
              
              {!discussionsLoading && forumDiscussions && forumDiscussions.length > 0 && (
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
          </div>
        </main>

        {/* Chart and Stats Sidebar - Right Side */}
        <aside className="w-80 pt-24 bg-transparent min-h-screen p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Crypto Chart - Top of sidebar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#e0a815]" />
                  {displayCrypto.symbol} Chart
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <PolygonChartDynamic symbol={resolvedParams.symbol} />
                </div>
              </CardContent>
            </Card>

            {/* Key Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Market Cap</span>
                  <span className="font-medium">$3.2T</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">P/E Ratio</span>
                  <span className="font-medium">28.5</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Dividend Yield</span>
                  <span className="font-medium">0.48%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">52 Week High</span>
                  <span className="font-medium">$1,408.00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">52 Week Low</span>
                  <span className="font-medium">$726.00</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">New analysis post</div>
                    <div className="text-xs text-muted-foreground">5 minutes ago</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Price target discussion</div>
                    <div className="text-xs text-muted-foreground">12 minutes ago</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Earnings call summary</div>
                    <div className="text-xs text-muted-foreground">1 hour ago</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
