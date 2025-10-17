"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { addIndexedFilter } from "@/lib/pagination";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface CommentVoteProps {
  commentId: string;
  upvotes: number;
  downvotes: number;
  onVoteChange?: () => void;
}

export function CommentVote({
  commentId,
  upvotes: initialUpvotes,
  downvotes: initialDownvotes,
  onVoteChange
}: CommentVoteProps) {
  const queryClient = useQueryClient();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [currentVote, setCurrentVote] = useState<"up" | "down" | null>(null);

  // Get user's current vote with indexed filter
  const { data: userVote, isLoading: voteLoading } = useQuery({
    queryKey: ["comment-user-vote", commentId],
    queryFn: async (): Promise<"up" | "down" | null> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        console.log(`Fetching vote for comment ${commentId} by user ${user.id}`);

        // Try direct query first (simpler approach)
        const { data, error } = await supabase
          .from("comment_votes")
          .select("vote_type")
          .eq("comment_id", commentId)
          .eq("user_id", user.id)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            // No rows found - user hasn't voted
            console.log(`No vote found for comment ${commentId}`);
            return null;
          } else {
            console.error("Error fetching comment vote:", error);
            return null;
          }
        }

        console.log(`Found vote for comment ${commentId}:`, data?.vote_type);
        return (data?.vote_type as "up" | "down") || null;
      } catch (error) {
        console.error("Error in comment vote query:", error);
        return null;
      }
    },
    enabled: !!commentId,
    staleTime: 0, // Always fetch fresh data
    gcTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false,
    retry: false // Disable retry to avoid spam
  });

  useEffect(() => {
    if (userVote !== undefined) {
      setCurrentVote(userVote);
    }
  }, [userVote]);

  // Debug logging for vote state
  useEffect(() => {
    console.log(`Comment ${commentId} - Current vote state:`, {
      userVote,
      currentVote,
      upvotes: initialUpvotes,
      downvotes: initialDownvotes
    });
  }, [userVote, currentVote, commentId, initialUpvotes, initialDownvotes]);

  // Update vote counts when comment data refreshes, but preserve user's vote choice
  useEffect(() => {
    setUpvotes(initialUpvotes);
    setDownvotes(initialDownvotes);
    // Note: currentVote state is preserved from the server query, not from props
  }, [initialUpvotes, initialDownvotes]);

  const voteMutation = useMutation({
    mutationFn: async (voteType: "up" | "down") => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Must be logged in to vote");

      const { data: existingVote, error: existingVoteError } = await supabase
        .from("comment_votes")
        .select("vote_type")
        .eq("comment_id", commentId)
        .eq("user_id", user.id)
        .single();

      if (existingVoteError && existingVoteError.code !== "PGRST116") {
        console.error("Error checking existing vote:", existingVoteError);
        throw existingVoteError;
      }

      // First, get the current comment to ensure we have the latest vote counts
      const { data: currentComment, error: fetchError } = await supabase
        .from("comments")
        .select("upvotes, downvotes")
        .eq("id", commentId)
        .single();

      if (fetchError) throw fetchError;

      const currentUpvotes = currentComment?.upvotes || 0;
      const currentDownvotes = currentComment?.downvotes || 0;

      if (existingVote) {
        // Remove existing vote
        if (existingVote.vote_type === voteType) {
          const { error: deleteError } = await supabase
            .from("comment_votes")
            .delete()
            .eq("comment_id", commentId)
            .eq("user_id", user.id);
          if (deleteError) throw deleteError;

          // Use RPC function to update vote counts
          const { error: updateError } = await supabase.rpc('decrement_comment_vote_count', {
            p_comment_id: commentId,
            p_vote_type: voteType
          });
          if (updateError) throw updateError;

          return { action: "remove", prevVote: voteType };
        } else {
          // Switch vote
          const { error: updateVoteError } = await supabase
            .from("comment_votes")
            .update({ vote_type: voteType })
            .eq("comment_id", commentId)
            .eq("user_id", user.id);
          if (updateVoteError) throw updateVoteError;

          // Use RPC functions to update vote counts
          const { error: decrementError } = await supabase.rpc('decrement_comment_vote_count', {
            p_comment_id: commentId,
            p_vote_type: existingVote.vote_type
          });
          if (decrementError) throw decrementError;

          const { error: incrementError } = await supabase.rpc('increment_comment_vote_count', {
            p_comment_id: commentId,
            p_vote_type: voteType
          });
          if (incrementError) throw incrementError;

          return { action: "switch", prevVote: existingVote.vote_type, newVote: voteType };
        }
      } else {
        // Add new vote
        const { error: insertError } = await supabase
          .from("comment_votes")
          .insert({
            comment_id: commentId,
            user_id: user.id,
            vote_type: voteType
          });
        if (insertError) throw insertError;

        // Use RPC function to update vote counts
        const { error: updateError } = await supabase.rpc('increment_comment_vote_count', {
          p_comment_id: commentId,
          p_vote_type: voteType
        });
        if (updateError) throw updateError;

        return { action: "add", newVote: voteType };
      }
    },
    onSuccess: (result) => {
      if (result.action === "remove") {
        if (result.prevVote === "up") setUpvotes(prev => prev - 1);
        if (result.prevVote === "down") setDownvotes(prev => prev - 1);
        setCurrentVote(null);
      } else if (result.action === "switch") {
        if (result.newVote === "up") {
          setUpvotes(prev => prev + 1);
          setDownvotes(prev => prev - 1);
          setCurrentVote("up");
        } else {
          setDownvotes(prev => prev + 1);
          setUpvotes(prev => prev - 1);
          setCurrentVote("down");
        }
      } else if (result.action === "add") {
        if (result.newVote === "up") {
          setUpvotes(prev => prev + 1);
          setCurrentVote("up");
        } else {
          setDownvotes(prev => prev + 1);
          setCurrentVote("down");
        }
      }

      queryClient.invalidateQueries({ queryKey: ["comment-user-vote", commentId] });
      onVoteChange?.();
    }
  });

  const handleVote = (voteType: "up" | "down") => {
    voteMutation.mutate(voteType);
  };

  const score = upvotes - downvotes;

  return (
    <div className="flex flex-col items-center gap-1 min-w-[40px]">
      <Button
        variant={currentVote === "up" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleVote("up")}
        className="h-6 w-6 p-0 hover:bg-muted/50"
      >
        <ThumbsUp className="w-3 h-3" />
      </Button>

      <span className={`text-xs font-medium ${score >= 0 ? "text-green-600" : "text-red-600"}`}>
        {score}
      </span>

      <Button
        variant={currentVote === "down" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleVote("down")}
        className="h-6 w-6 p-0 hover:bg-muted/50"
      >
        <ThumbsDown className="w-3 h-3" />
      </Button>
    </div>
  );
}
