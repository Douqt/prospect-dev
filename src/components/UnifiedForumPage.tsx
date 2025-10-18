"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { buildCursorQuery, addIndexedFilter } from "@/lib/pagination";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, MessageSquare, Users, TrendingUp, Heart, ArrowLeft } from "lucide-react";
import Link from "next/link";

import FollowForumButton from "@/components/FollowForumButton";
import { useRouter } from "next/navigation";
import { LazyImage } from "@/components/LazyImage";
import { DiscussionListSkeleton } from "@/components/ui/skeleton-loading";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CreatePostForm } from "@/components/discussions/CreatePostForm";
import { Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { STOCK_FORUMS } from "../../forum-categories";
import { CRYPTO_FORUMS } from "@/lib/cryptoForums";

// Helper function to format numbers with commas
const formatNumber = (num: string | number) => {
  if (typeof num === 'string') {
    const parsed = parseFloat(num.replace(/,/g, ''));
    if (isNaN(parsed)) return num;
    return parsed.toLocaleString();
  }
  return num.toLocaleString();
};

// Helper function to format currency values
const formatCurrency = (value: string) => {
  const numValue = parseFloat(value.replace(/[$,]/g, ''));
  if (isNaN(numValue)) return value;
  return `$${numValue.toLocaleString()}`;
};

interface ForumData {
  symbol: string;
  name: string;
  posts: number;
  members: string;
  description: string;
}

interface UnifiedForumPageProps {
  params: Promise<{ symbol: string }>;
  forumType: 'stocks' | 'crypto' | 'futures';
  backLink: string;
  getMetadata: (symbol: string) => { symbol: string; name: string; description: string };
  getRouterPath: (category: string) => string;
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  views: number;
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

interface ForumPostListProps {
  category: string;
  discussions: Discussion[];
  isLoading: boolean;
  getRouterPath: (category: string) => string;
}

// Forum post component that matches dashboard styling but without chart and category badge
function ForumPostList({ category, discussions, isLoading, getRouterPath }: ForumPostListProps) {
  if (isLoading) {
    return <DiscussionListSkeleton />;
  }

  if (!discussions || discussions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 space-y-4">
        <div className="text-muted-foreground text-center">
          No discussions yet. Be the first to start a conversation!
        </div>
        <div className="text-xs text-muted-foreground text-center max-w-lg">
          👆 Click "New Post" above to create your first discussion
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[#e0a815]/50 rounded-lg overflow-hidden">
      {discussions.map((discussion, index) => (
        <div key={discussion.id}>
          {index > 0 && <div className="h-px bg-[#e0a815]/30 w-full"></div>}
          <Card
            className={`border-0 transition-all duration-200 cursor-pointer
            ${index === 0 ? 'rounded-t-lg' :
              index === discussions.length - 1 ? 'rounded-b-lg' : 'rounded-none'}
            group hover:bg-gray-800 hover:shadow-md text-card-foreground shadow-sm`}
            onClick={() => window.location.href = `${getRouterPath(discussion.category)}/${discussion.category.toLowerCase()}/${discussion.id}`}
          >
            <CardContent className="p-6">
              <div className="flex gap-6">
                {/* Post Content - Left Side */}
                <div className="flex-1">
                  {/* User Info */}
                  <div className="flex items-center gap-3 mb-3">
                    <Link href={`/profile/${discussion.profiles?.username || ''}`}>
                      <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-[e0a815] cursor-pointer hover:opacity-80 transition-opacity">
                        {discussion.profiles?.avatar_url ? (
                          <img
                            src={discussion.profiles.avatar_url}
                            alt={`${discussion.profiles?.display_name || discussion.profiles?.username || 'Trader'} avatar`}
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
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link href={`/profile/${discussion.profiles?.username || ''}`}>
                          <p className="font-semibold text-sm cursor-pointer hover:text-[#e0a815] transition-colors">
                            {discussion.profiles?.display_name ?? discussion.profiles?.username ?? 'Trader'}
                          </p>
                        </Link>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg mb-2 hover:text-[#e0a815] transition-colors cursor-pointer">
                      {discussion.title}
                    </h3>
                    <div className="text-muted-foreground mb-3">
                      {discussion.image_url && (
                        <div className="mb-3">
                          <LazyImage
                            src={discussion.image_url}
                            alt="Post image"
                            className="rounded-lg max-w-full h-auto max-h-96 object-cover"
                            placeholder="blur"
                          />
                        </div>
                      )}
                      {discussion.content.split('\n').map((paragraph, index) => (
                        paragraph.trim() ? (
                          <p key={index} className="mb-2 last:mb-0">{paragraph}</p>
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
                      {discussion.views}
                    </button>
                    <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-red-500 transition-colors">
                      <Heart className="w-4 h-4" />
                      {discussion.upvotes - discussion.downvotes}
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

export function UnifiedForumPage({
  params,
  forumType,
  backLink,
  getMetadata,
  getRouterPath
}: UnifiedForumPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ symbol: string } | null>(null);
  const [newPostDialogOpen, setNewPostDialogOpen] = useState(false);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const metadata = resolvedParams ? getMetadata(resolvedParams.symbol) : null;

  const fallbackData: ForumData = {
    symbol: metadata?.symbol || '',
    name: metadata?.name || '',
    posts: 0,
    members: "Loading...",
    description: metadata?.description || ''
  };

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
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch posts for this forum with cursor-based pagination and indexed filters
  const { data: forumDiscussions, isLoading: discussionsLoading } = useQuery({
    queryKey: ["forum-discussions", resolvedParams?.symbol],
    queryFn: async () => {
      if (!resolvedParams?.symbol) return [];

      // Use indexed filter for forum discussions (category equivalent)
      let query = supabase
        .from("discussions")
        .select("id, title, content, category, created_at, upvotes, downvotes, views, comment_count, user_id, image_url");

      // Apply indexed filter for category
      query = addIndexedFilter(query, 'discussions', { category: resolvedParams.symbol.toLowerCase() });

      // Apply cursor-based pagination
      query = buildCursorQuery(query, { limit: 20 });

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) return [];

      const discussionsWithProfiles = await Promise.all(
        data.map(async (discussion) => {
          // Use indexed filter for profile lookup
          let profileQuery = supabase
            .from("profiles")
            .select("username, display_name, avatar_url");

          profileQuery = addIndexedFilter(profileQuery, 'profiles', { user_id: discussion.user_id });

          const { data: profile } = await profileQuery.single();

          return {
            ...discussion,
            profiles: profile || { username: null, display_name: null, avatar_url: null },
            _count: { comments: discussion.comment_count || 0 }
          };
        })
      );

      return discussionsWithProfiles;
    },
    enabled: !!resolvedParams?.symbol
  });

  // Fetch recent activity for this forum
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ["recent-activity", resolvedParams?.symbol],
    queryFn: async () => {
      if (!resolvedParams?.symbol) return [];

      // Get recent discussions for this forum with profile data
      let query = supabase
        .from("discussions")
        .select(`
          id,
          title,
          created_at,
          user_id,
          profiles!inner(username, display_name)
        `)
        .eq("category", resolvedParams.symbol.toLowerCase())
        .order("created_at", { ascending: false })
        .limit(5);

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    },
    enabled: !!resolvedParams?.symbol,
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });

  const displayData = forumStats ? { ...fallbackData, ...forumStats } : fallbackData;

  // Get data based on forum type
  const stockData = resolvedParams && forumType === 'stocks' ? STOCK_FORUMS[resolvedParams.symbol.toUpperCase()] : null;
  const cryptoData = resolvedParams && forumType === 'crypto' ? CRYPTO_FORUMS[resolvedParams.symbol.toUpperCase()] : null;

  if (!resolvedParams) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
        <Sidebar />
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(128, 128, 128, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(128, 128, 128, 0.1) 1px, transparent 1px)`,
          backgroundSize: "100px 100px",
        }}
      />
        <Navbar />
        <main className="relative z-10 pt-24 ml-[300px]">
          <div className="flex max-w-7xl mx-auto px-6">
            <div className="flex-1 max-w-4xl mx-auto">
              <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
                <div className="text-muted-foreground">Loading forum...</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      <Sidebar />
      <Navbar />

      <div className="flex">
        {/* Main Content - Centered */}
        <main className="flex-1 relative z-10 pt-24 ml-[300px]">
          <div className="flex max-w-7xl mx-auto px-6">
            {/* Main Feed - Centered */}
            <div className="flex-1 max-w-4xl mx-auto">
              {/* Back Button */}
              <Link href={backLink} className="inline-flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to {forumType.charAt(0).toUpperCase() + forumType.slice(1)}
              </Link>

              {/* Forum Header */}
              <div className="mb-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#e0a815]/10 to-[#f2c74b]/10 border border-[#e0a815]/20 flex items-center justify-center">
                    <BarChart3 className="h-8 w-8 text-[#e0a815]" />
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-4xl font-bold">
                      {forumType === 'crypto' && cryptoData ? cryptoData : (stockData ? stockData.Name : displayData.symbol)}
                    </h1>
                    <p className="text-muted-foreground text-lg">
                      {displayData.symbol} • {forumType === 'crypto' ? 'Cryptocurrency' : (stockData ? stockData.Country : 'Loading...')}
                    </p>
                    <p className="text-muted-foreground">{displayData.description}</p>
                  </div>
                </div>

                {/* Forum Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">{displayData.posts.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Posts</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">{displayData.members}</div>
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-2xl">
                        <MessageSquare className="h-6 w-6 text-[#e0a815]" />
                        {displayData.symbol} Discussions
                        <Badge variant="secondary" className="ml-2">Forum Activity</Badge>
                      </CardTitle>
                      <p className="text-muted-foreground mt-1">
                        Join fellow traders discussing {displayData.name}
                      </p>
                    </div>
                    <Dialog open={newPostDialogOpen} onOpenChange={setNewPostDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          New Post
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogTitle>Create New Post</DialogTitle>
                        <DialogDescription>
                          Share your thoughts and start a discussion about {displayData.name}.
                        </DialogDescription>
                        <CreatePostForm
                          category={resolvedParams.symbol.toLowerCase()}
                          onClose={() => setNewPostDialogOpen(false)}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ForumPostList
                    category={resolvedParams.symbol.toLowerCase()}
                    discussions={forumDiscussions || []}
                    isLoading={discussionsLoading}
                    getRouterPath={getRouterPath}
                  />
                </CardContent>
              </Card>

              <div className="h-16"></div>
            </div>

            {/* Chart and Stats Sidebar - Right Side (Hidden for crypto) */}
            {forumType !== 'crypto' && (
              <aside className="w-96 pl-8">
                <div className="sticky top-6">
                  <div className="space-y-6">
                    {/* Key Statistics */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Key Statistics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Market Cap</span>
                          <span className="font-medium">
                            {stockData ? formatCurrency(stockData['Market Cap']) : 'Loading...'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Last Sale</span>
                          <span className="font-medium">
                            {stockData ? stockData['Last Sale'] : 'Loading...'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Net Change</span>
                          <span className={`font-medium ${stockData && stockData['Net Change'].startsWith('-') ? 'text-red-500' : 'text-green-500'}`}>
                            {stockData ? `${stockData['Net Change']} (${stockData['% Change']})` : 'Loading...'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Volume</span>
                          <span className="font-medium">
                            {stockData ? formatNumber(stockData.Volume) : 'Loading...'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Sector</span>
                          <span className="font-medium">
                            {stockData ? stockData.Sector : 'Loading...'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Recent Activity</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {activityLoading ? (
                          <div className="text-center text-muted-foreground text-sm py-4">
                            Loading recent activity...
                          </div>
                        ) : recentActivity && recentActivity.length > 0 ? (
                          recentActivity.map((activity: any, index) => {
                            const userDisplayName = activity.profiles?.[0]?.display_name ||
                              activity.profiles?.[0]?.username ||
                              'Anonymous';
                            const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true });

                            // Determine activity type based on title/content
                            let activityType = 'New discussion';
                            let activityColor = 'bg-green-500';

                            if (activity.title.toLowerCase().includes('analysis')) {
                              activityType = 'New analysis';
                              activityColor = 'bg-blue-500';
                            } else if (activity.title.toLowerCase().includes('target')) {
                              activityType = 'Price target';
                              activityColor = 'bg-purple-500';
                            } else if (activity.title.toLowerCase().includes('earnings')) {
                              activityType = 'Earnings update';
                              activityColor = 'bg-orange-500';
                            }

                            return (
                              <div key={activity.id} className="flex items-start gap-3">
                                <div className={`w-2 h-2 ${activityColor} rounded-full mt-2`}></div>
                                <div className="space-y-1 flex-1">
                                  <div className="text-sm font-medium">
                                    <span className="text-[#e0a815]">{userDisplayName}</span> posted "{activity.title}"
                                  </div>
                                  <div className="text-xs text-muted-foreground">{timeAgo}</div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center text-muted-foreground text-sm py-4">
                            No recent activity
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
