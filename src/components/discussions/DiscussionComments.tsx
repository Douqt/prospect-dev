"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { buildCursorQuery, addIndexedFilter } from "@/lib/pagination";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CommentVote } from "./CommentVote";
import { Send } from "lucide-react";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { useProfile } from "@/hooks/useProfile";
import { useRouter } from "next/navigation";

/**
 * Comment data structure with profile and vote information
 */
export interface Comment {
  id: string;
  content: string;
  user_id: string;
  discussion_id: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  profiles: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
  _count: {
    votes: {
      up: number;
      down: number;
    };
  };
}

/**
 * Props for the DiscussionComments component
 */
export interface DiscussionCommentsProps {
  /** ID of the discussion to show comments for */
  discussionId: string;
  /** Callback when comment count changes */
  onCommentCountChange?: () => void;
}

/**
 * Component for displaying and managing discussion comments
 * Handles comment fetching, posting, and voting interactions
 */
export function DiscussionComments({ discussionId, onCommentCountChange }: DiscussionCommentsProps) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const { profile } = useProfile(currentUser || undefined);

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user?.id || null);
    };
    getUser();
  }, []);

  /**
   * Fetches comments for the discussion with profile data
   */
  const { data: comments, isLoading, error, refetch } = useQuery({
    queryKey: ["comments", discussionId],
    queryFn: async (): Promise<Comment[]> => {
      return await fetchCommentsWithProfiles(discussionId);
    }
  });

  /**
   * Posts a new comment to the discussion
   */
  const postComment = async () => {
    if (!newComment.trim() || !currentUser) return;

    try {
      const { error } = await supabase
        .from("comments")
        .insert({
          content: newComment.trim(),
          discussion_id: discussionId,
          user_id: currentUser
        });

      if (error) throw error;

      // Use RPC function to increment comment count
      try {
        await supabase.rpc('increment_comment_count', {
          p_discussion_id: discussionId
        });
      } catch (rpcError) {
        console.error("Error incrementing comment count:", rpcError);
      }

      setNewComment("");
      refetch();
      onCommentCountChange?.();
    } catch (error) {
      console.error("Error posting comment:", error);
    }
  };

  /**
   * Fetches comments with associated profile data using optimized queries
   * @param discussionId - ID of the discussion to fetch comments for
   * @returns Promise resolving to comments with profile data
   */
  const fetchCommentsWithProfiles = async (discussionId: string): Promise<Comment[]> => {
    // Use indexed filter for comments (post_id equivalent to discussion_id)
    let query = supabase
      .from("comments")
      .select("id, content, user_id, discussion_id, created_at, upvotes, downvotes");

    // Apply indexed filter for discussion_id (post_id equivalent)
    query = addIndexedFilter(query, 'comments', { post_id: discussionId });

    // Apply cursor-based pagination with ascending order for comments
    query = buildCursorQuery(query, { limit: 50, orderColumn: 'created_at' });

    const { data: commentsData, error: commentsError } = await query;

    if (commentsError) throw commentsError;

    // Enrich comments with profile data using indexed queries
    const commentsWithProfiles = await Promise.all(
      commentsData.map(async (comment) => {
        // Use indexed filter for profile lookup
        let profileQuery = supabase
          .from("profiles")
          .select("username, display_name, avatar_url");

        profileQuery = addIndexedFilter(profileQuery, 'profiles', { user_id: comment.user_id });

        const { data: profile } = await profileQuery.single();

        return {
          ...comment,
          profiles: profile || { username: null, display_name: null, avatar_url: null }
        };
      })
    );

    // Transform data to match our interface
    return commentsWithProfiles.map((comment) => ({
      ...comment,
      _count: {
        votes: {
          up: comment.upvotes || 0,
          down: comment.downvotes || 0
        }
      }
    })) as Comment[];
  };

  if (isLoading) {
    return (
      <div className="mt-4 space-y-4">
        <div className="text-sm text-muted-foreground">Loading comments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 space-y-4">
        <div className="text-sm text-destructive">Error loading comments</div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {comments && comments.length > 0 ? (
        comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} onVoteChange={() => {
            refetch();
            // Also invalidate comment vote queries to ensure they refetch if needed
            queryClient.invalidateQueries({ queryKey: ["comment-user-vote"] });
          }} />
        ))
      ) : (
        <div className="text-sm text-muted-foreground">No comments yet.</div>
      )}

      {/* New comment form */}
      <div className="flex gap-3 pt-4 border-t">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback>
            {profile?.username?.[0]?.toUpperCase() ||
             profile?.display_name?.[0]?.toUpperCase() ||
             "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder="Share your thoughts..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <Button
            onClick={postComment}
            disabled={!newComment.trim()}
            className="flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment, onVoteChange }: { comment: Comment; onVoteChange: () => void }) {
  const router = useRouter();
  const userDisplayName = comment.profiles?.display_name ||
    comment.profiles?.username ||
    "Anonymous";

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });

  return (
    <div className="flex items-start gap-3">
      <CommentVote
        commentId={comment.id}
        upvotes={comment._count.votes.up}
        downvotes={comment._count.votes.down}
        onVoteChange={onVoteChange}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const username = comment.profiles?.username;
              if (username) {
                router.push(`/profile/${username}`);
              }
            }}
            className="hover:opacity-80 transition-opacity"
          >
            <Avatar className="w-6 h-6">
              <AvatarImage src={comment.profiles?.avatar_url} />
              <AvatarFallback className="text-xs">
                {userDisplayName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const username = comment.profiles?.username;
              if (username) {
                router.push(`/profile/${username}`);
              }
            }}
            className="hover:underline text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="font-medium">{userDisplayName}</span>
          </button>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>

        <div className="text-sm whitespace-pre-wrap">
          {comment.content}
        </div>
      </div>
    </div>
  );
}
