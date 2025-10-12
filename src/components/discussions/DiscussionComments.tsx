"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CommentVote } from "./CommentVote";
import { Send } from "lucide-react";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { useProfile } from "@/hooks/useProfile";
import { useRouter } from "next/navigation";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  discussion_id: string;
  created_at: string;
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

interface DiscussionCommentsProps {
  discussionId: string;
}

export function DiscussionComments({ discussionId }: DiscussionCommentsProps) {
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

  const { data: comments, isLoading, error, refetch } = useQuery({
    queryKey: ["comments", discussionId],
    queryFn: async () => {
      // First get comments
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("id, content, user_id, discussion_id, created_at, upvotes, downvotes")
        .eq("discussion_id", discussionId)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;

      // Then get profiles separately
      const commentsWithProfiles = await Promise.all(
        commentsData.map(async (comment) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, display_name, avatar_url")
            .eq("id", comment.user_id)
            .single();

          return {
            ...comment,
            profiles: profile || { username: null, display_name: null, avatar_url: null }
          };
        })
      );

      const finalCommentsData = commentsWithProfiles;

      // Transform data to match our interface
      return finalCommentsData.map((comment: { id: string; [key: string]: unknown }) => ({
        ...comment,
        _count: {
          votes: {
            up: comment.upvotes,
            down: comment.downvotes
          }
        }
      })) as Comment[];
    }
  });

  const postComment = async () => {
    if (!newComment.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("comments")
      .insert({
        content: newComment.trim(),
        discussion_id: discussionId,
        user_id: user.id
      });

    if (error) {
      console.error("Error posting comment:", error);
      return;
    }

    setNewComment("");
    refetch();
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
          <CommentItem key={comment.id} comment={comment} onVoteChange={() => refetch()} />
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
