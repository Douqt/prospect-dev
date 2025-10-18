"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { buildCursorQuery, addIndexedFilter } from "@/lib/pagination";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, MessageSquare, TrendingUp, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LazyImage } from "@/components/LazyImage";
import { DiscussionListSkeleton } from "@/components/ui/skeleton-loading";

/**
 * Discussion data structure with profile information
 */
export interface Discussion {
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
  user_id: string;
  profiles: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
  _count: {
    comments: number;
  };
}

/**
 * Forum statistics data structure
 */
export interface ForumStats {
  symbol: string;
  price: string;
  change: string;
  changeColor: string;
  posts: string;
  members: string;
}

/**
 * Feed type options
 */
export type FeedType = 'for-you' | 'following';

/**
 * Forum type options
 */
export type ForumType = 'stocks' | 'crypto' | 'futures' | 'all';

/**
 * Props for the UnifiedDashboard component
 */
export interface UnifiedDashboardProps {
  /** Main title for the dashboard */
  title: string;
  /** Description text for the dashboard */
  description: string;
  /** Badge text to display */
  badgeText: string;
  /** Type of forum being displayed */
  forumType: ForumType;
  /** List of available forums */
  forumList: string[];
  /** Top symbols to display in sidebar (default: tech stocks) */
  topSymbols?: string[];
  /** Symbols to preload data for */
  preloadSymbols?: string[];
  /** Function to filter discussions by category */
  categoryFilter: (category: string) => boolean;
  /** Function to get router path for a category */
  getRouterPath: (category: string) => string;
}

/**
 * Unified dashboard component for displaying forum discussions and community stats
 * Features feed filtering, community stats sidebar, and responsive design
 */
export function UnifiedDashboard({
  title,
  description,
  badgeText,
  forumType,
  forumList,
  topSymbols = ['NVDA', 'AAPL', 'MSFT', 'TSLA'],
  preloadSymbols = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'GOOGL', 'AMZN'],
  categoryFilter,
  getRouterPath
}: UnifiedDashboardProps) {
  const router = useRouter();
  const [feedType, setFeedType] = useState<FeedType>('for-you');

  /**
   * Fetches top community statistics with fallback mechanism
   * Uses new API endpoint with fallback to individual forum stats
   */
  const { data: topCommunitiesData, isLoading: topCommunitiesLoading } = useQuery({
    queryKey: ["top-communities", forumType],
    queryFn: async (): Promise<ForumStats[]> => {
      try {
        const response = await fetch(`/api/top-communities?forumType=${forumType}&limit=5`);
        if (!response.ok) throw new Error('Failed to fetch top communities');
        return await response.json();
      } catch (error) {
        // Fallback to old method if new API fails
        const results = await Promise.all(
          topSymbols.map(async (symbol): Promise<ForumStats> => {
            try {
              const response = await fetch(`/api/forum-stats?symbol=${symbol}`);
              if (!response.ok) throw new Error(`Failed to fetch ${symbol} stats`);
              const data = await response.json();
              return { symbol, ...data };
            } catch {
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
      }
    },
    refetchInterval: 60000 // Refresh every minute
  });

  /**
   * Fetches discussions with profile data based on feed type
   * Handles both "for-you" and "following" feed types with optimized queries
   */
  const { data: discussions, isLoading, error } = useQuery({
    queryKey: ["discussions", "dashboard", feedType, forumType],
    queryFn: async (): Promise<Discussion[]> => {
      if (feedType === 'following') {
        return await fetchFollowingDiscussions();
      } else {
        return await fetchForYouDiscussions();
      }
    }
  });

  /**
   * Fetches discussions from followed communities using the new optimized API
   */
  const fetchFollowingDiscussions = async (): Promise<Discussion[]> => {
    try {
      const response = await fetch('/api/followed-discussions?limit=20');
      if (!response.ok) throw new Error('Failed to fetch followed discussions');

      const data = await response.json();

      // Filter by forum type if needed
      const filteredDiscussions = data.discussions?.filter((d: any) =>
        categoryFilter(d.category?.toUpperCase() || '')
      ) || [];

      if (filteredDiscussions.length === 0) return [];

      return filteredDiscussions;
    } catch (error) {
      console.error('Error fetching followed discussions:', error);
      return [];
    }
  };

  /**
   * Fetches discussions for the main "for you" feed
   */
  const fetchForYouDiscussions = async (): Promise<Discussion[]> => {
    let discussionsQuery = supabase
      .from("discussions")
      .select("id, title, content, category, created_at, upvotes, downvotes, views, comment_count, user_id, image_url");

    discussionsQuery = buildCursorQuery(discussionsQuery, { limit: 20 });

    const { data, error } = await discussionsQuery;
    if (error) throw error;

    const filteredDiscussions = data?.filter(d => categoryFilter(d.category?.toUpperCase() || '')) || [];
    if (filteredDiscussions.length === 0) return [];

    return await enrichDiscussionsWithProfiles(filteredDiscussions);
  };

  /**
   * Enriches discussions with user profile data using batch optimization
   * @param discussions - Array of discussions to enrich
   * @returns Discussions with profile data attached
   */
  const enrichDiscussionsWithProfiles = async (discussions: any[]): Promise<Discussion[]> => {
    const discussionsWithProfiles = await Promise.all(
      discussions.map(async (discussion) => {
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

    return discussionsWithProfiles as Discussion[];
  };

  const filteredDiscussions = discussions || [];

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

      <main className="relative z-10 pt-24 ml-[300px]">
        <div className="flex max-w-7xl mx-auto px-6">
          {/* Main Feed - Centered */}
          <div className="flex-1 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-4xl font-bold mb-2">{title}</h1>
                  <p className="text-muted-foreground">{description}</p>
                </div>
                <Badge variant="secondary" className="bg-[#e0a815]/10 text-[#e0a815]">
                  {badgeText}
                </Badge>
              </div>

              {/* Feed Type Buttons */}
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
                <DiscussionListSkeleton />
              ) : filteredDiscussions.length === 0 ? (
                <Card className="text-center py-12 border-0 rounded-none">
                  <CardContent>
                    <div className="mb-4">
                      <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">
                        {feedType === 'following' ? "No posts from followed forums yet" : `No ${forumType} posts yet`}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {feedType === 'following'
                          ? `Start following ${forumType} traders to see their posts here`
                          : `Be the first to post in our ${forumType} trading community`
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filteredDiscussions.map((discussion, index) => (
                  <div key={discussion.id}>
                    {index > 0 && <div className="h-px bg-[#e0a815]/30 w-full"></div>}
                    <Card
                      className={`border-0 transition-all duration-200 cursor-pointer
                      ${index === 0 ? 'rounded-t-lg' :
                        index === filteredDiscussions.length - 1 ? 'rounded-b-lg' : 'rounded-none'}
                      group hover:bg-gray-800 hover:shadow-md [&:has(.chart:hover)]:bg-card text-card-foreground shadow-sm`}
                      onClick={() => router.push(`${getRouterPath(discussion.category)}/${discussion.category.toLowerCase()}/${discussion.id}`)}
                    >
                      <CardContent className="p-6">
                        {/* User Info */}
                        <div className="flex items-center gap-3 mb-3" onClick={(e) => e.stopPropagation()}>
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
                          <div>
                            <Link href={`/profile/${discussion.profiles?.username || ''}`}>
                              <p className="font-semibold text-sm cursor-pointer hover:text-[#e0a815] transition-colors">
                                {discussion.profiles?.display_name ?? discussion.profiles?.username ?? 'Trader'}
                              </p>
                            </Link>
                            <Link href={`${getRouterPath(discussion.category)}/${discussion.category.toLowerCase()}`}>
                              <span className="cursor-pointer text-xs px-2 py-1 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                                {discussion.category.toUpperCase()}
                              </span>
                            </Link>
                          </div>
                        </div>

                        {/* Post Content */}
                        <div className="mb-4">
                          <Link href={`${getRouterPath(discussion.category)}/${discussion.category.toLowerCase()}/${discussion.id}`}>
                            <h3 className="font-semibold text-lg mb-2 hover:text-[#e0a815] transition-colors cursor-pointer">
                              {discussion.title}
                            </h3>
                          </Link>
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

            <div className="h-16"></div>
          </div>

          {/* Top Communities Sidebar - Right Side */}
          <div className="w-96 pl-8 border-border">
            <div className="sticky top-6">
              <h2 className="text-xl font-semibold mb-4">Top Communities</h2>
              <div className="space-y-4">
                {topCommunitiesLoading ? (
                  topSymbols.map((symbol) => (
                    <Card key={symbol} className="text-center opacity-50">
                      <CardContent className="p-4">
                        <div className="text-lg font-bold text-muted-foreground">{symbol}</div>
                        <div className="text-xs text-muted-foreground mt-1">Loading members • Loading posts</div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  topCommunitiesData?.map((community) => (
                    <Card key={community.symbol} className="text-center">
                      <CardContent className="p-4">
                        <div className="text-lg font-bold text-[#e0a815]">{community.symbol.toUpperCase()}</div>
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
