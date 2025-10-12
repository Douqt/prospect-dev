"use client";

import { useQuery } from "@tanstack/react-query";
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
  category: "stocks" | "crypto" | "futures";
}

export function DiscussionList({ category }: DiscussionListProps) {
  const { data: discussions, isLoading, error } = useQuery({
    queryKey: ["discussions", category],
    queryFn: async () => {
      // First get discussions
      const { data: discussionsData, error: discussionsError } = await supabase
        .from("discussions")
        .select("id, title, content, user_id, image_url, category, created_at, upvotes, downvotes, comment_count")
        .eq("category", category)
        .order("created_at", { ascending: false });

      if (discussionsError) throw discussionsError;

      // Then get profiles separately
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

      const finalDiscussionsData = discussionsWithProfiles;

      // Transform data to match our interface
      return finalDiscussionsData.map((discussion: { id: string; [key: string]: unknown }) => ({
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
    <div className="space-y-4">
      {discussions.map((discussion) => (
        <DiscussionPost key={discussion.id} discussion={discussion} />
      ))}
    </div>
  );
}
