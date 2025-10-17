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
      console.log(`Starting vote mutation for comment ${commentId}, voteType: ${voteType}, currentVote: ${currentVote}`);

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

      console.log(`Existing vote for comment ${commentId}:`, existingVote);

      if (existingVote) {
        // Remove existing vote
        if (existingVote.vote_type === voteType) {
          console.log(`Removing vote ${voteType} for comment ${commentId}`);

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
          console.log(`Switching vote from ${existingVote.vote_type} to ${voteType} for comment ${commentId}`);

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
        console.log(`Adding new vote ${voteType} for comment ${commentId}`);

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
      console.log(`Mutation onSuccess for comment ${commentId}, action: ${result.action}`, result);

      // Update current vote state based on the mutation result
      if (result.action === "remove") {
        setCurrentVote(null);
      } else if (result.action === "switch") {
        setCurrentVote(result.newVote);
      } else if (result.action === "add") {
        setCurrentVote(result.newVote);
      }

      // Invalidate queries to refresh data from server
      queryClient.invalidateQueries({ queryKey: ["comment-user-vote", commentId] });
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      onVoteChange?.();
    }
  });

  const handleVote = (voteType: "up" | "down") => {
    console.log(`handleVote called for comment ${commentId}, voteType: ${voteType}, currentVote: ${currentVote}`);
    console.log(`Mutation state before:`, {
      isPending: voteMutation.isPending,
      isSuccess: voteMutation.isSuccess,
      isError: voteMutation.isError,
      failureCount: voteMutation.failureCount
    });

    // Prevent double mutations
    if (voteMutation.isPending) {
      console.log(`Preventing double mutation for comment ${commentId}`);
      return;
    }

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
