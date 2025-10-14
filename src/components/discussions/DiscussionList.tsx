"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DiscussionPost } from "./DiscussionPost";

interface Discussion {
  id: string;
  title: string;
  content: string;
  user_id: string;
  image_url?: string;
  category: string;
  created_at: string;
  profiles: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
  _count: {
    comments: number;
    votes: {
      up: number;
      down: number;
    };
  };
}

interface DiscussionListProps {
  category: string;
}

export function DiscussionList({ category }: DiscussionListProps) {
  const [offset, setOffset] = useState(0);
  const [allDiscussions, setAllDiscussions] = useState<Discussion[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Initial query for first load
  const { data: initialDiscussions, isLoading, error } = useQuery({
    queryKey: ["discussions", category, "initial"],
    queryFn: async () => {
      const { data: discussionsData, error: discussionsError } = await supabase
        .from("discussions")
        .select("id, title, content, user_id, image_url, category, created_at, upvotes, downvotes, comment_count")
        .eq("category", category)
        .order("created_at", { ascending: false })
        .limit(20);

      if (discussionsError) throw discussionsError;

      // Get profiles separately
      const discussionsWithProfiles = await Promise.all(
        discussionsData.map(async (discussion) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, display_name, avatar_url")
            .eq("id", discussion.user_id)
            .single();

          return {
            ...discussion,
            profiles: profile || { username: null, display_name: null, avatar_url: null }
          };
        })
      );

      // Transform data to match our interface
      return discussionsWithProfiles.map((discussion) => ({
        ...discussion,
        _count: {
          comments: discussion.comment_count,
          votes: {
            up: discussion.upvotes,
            down: discussion.downvotes
          }
        }
      })) as Discussion[];
    }
  });

  // Load more function for infinite scroll
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);

    try {
      const newOffset = offset + 20;
      const { data: moreDiscussions, error: loadError } = await supabase
        .from("discussions")
        .select("id, title, content, user_id, image_url, category, created_at, upvotes, downvotes, comment_count")
        .eq("category", category)
        .order("created_at", { ascending: false })
        .range(newOffset, newOffset + 19);

      if (loadError) throw loadError;

      if (moreDiscussions.length < 20) {
        setHasMore(false);
      }

      if (moreDiscussions.length > 0) {
        // Get profiles for new discussions
        const moreWithProfiles = await Promise.all(
          moreDiscussions.map(async (discussion) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("username, display_name, avatar_url")
              .eq("id", discussion.user_id)
              .single();

            return {
              ...discussion,
              profiles: profile || { username: null, display_name: null, avatar_url: null }
            };
          })
        );

        const transformedMoreDiscussions = moreWithProfiles.map((discussion) => ({
          ...discussion,
          _count: {
            comments: discussion.comment_count,
            votes: {
              up: discussion.upvotes,
              down: discussion.downvotes
            }
          }
        })) as Discussion[];

        setAllDiscussions(prev => [...prev, ...transformedMoreDiscussions]);
        setOffset(newOffset);
      }
    } catch (error) {
      console.error("Error loading more discussions:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [category, offset, isLoadingMore, hasMore]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [loadMore]);

  // Update allDiscussions when initial data loads
  useEffect(() => {
    if (initialDiscussions) {
      setAllDiscussions(initialDiscussions);
      setOffset(0); // Reset offset
      setHasMore(true); // Allow loading more

      // Check if initial load already has less than limit
      if (initialDiscussions.length < 20) {
        setHasMore(false);
      }
    }
  }, [initialDiscussions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">Loading discussions...</div>
      </div>
    );
  }

  if (error) {
    console.error("DiscussionList error:", error);
    return (
      <div className="flex flex-col items-center justify-center h-32 space-y-4">
        <div className="text-destructive">Error loading discussions</div>
        <div className="text-xs text-muted-foreground text-center max-w-lg">
          Database error details: {JSON.stringify(error)}
          <br /><br />
          Make sure you've run the ALTER TABLE commands and added the new columns.
          Check the discussions and profiles tables have the correct structure.
        </div>
      </div>
    );
  }

  if (!allDiscussions || allDiscussions.length === 0) {
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
    <div>
      {allDiscussions.map((discussion, index) => (
        <div key={discussion.id}>
          <DiscussionPost discussion={discussion} />
          {index < allDiscussions.length - 1 && (
            <div className="border-t border-[#e0a815]/20"></div>
          )}
        </div>
      ))}

      {/* Load more trigger element */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="flex items-center justify-center py-8"
        >
          {isLoadingMore ? (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#e0a815]"></div>
              <span>Loading more discussions...</span>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">
              Scroll down to load more posts...
            </div>
          )}
        </div>
      )}

      {!hasMore && allDiscussions.length > 0 && (
        <div className="text-center py-6 px-4">
          <div className="inline-flex items-center gap-2 bg-muted/30 px-4 py-2 rounded-full border border-[#e0a815]/50">
            <div className="w-1 h-1 bg-[#e0a815] rounded-full"></div>
            <p className="text-muted-foreground text-xs">You've reached the end of the feed</p>
            <div className="w-1 h-1 bg-[#e0a815] rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  );
}
