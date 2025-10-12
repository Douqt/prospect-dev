"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useEffect, useState } from "react";

interface DiscussionVotesProps {
  discussionId: string;
  upvotes: number;
  downvotes: number;
}

export function DiscussionVotes({
  discussionId,
  upvotes: initialUpvotes,
  downvotes: initialDownvotes
}: DiscussionVotesProps) {
  const queryClient = useQueryClient();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [currentVote, setCurrentVote] = useState<"up" | "down" | null>(null);

  // Get user's current vote
  const { data: userVote } = useQuery({
    queryKey: ["user-vote", discussionId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("discussion_votes")
        .select("vote_type")
        .eq("discussion_id", discussionId)
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
      return data?.vote_type || null;
    },
    enabled: !!discussionId
  });

  useEffect(() => {
    if (userVote) {
      setCurrentVote(userVote);
    }
  }, [userVote]);

  const voteMutation = useMutation({
    mutationFn: async (voteType: "up" | "down") => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Must be logged in to vote");

      const { data: existingVote } = await supabase
        .from("discussion_votes")
        .select("vote_type")
        .eq("discussion_id", discussionId)
        .eq("user_id", user.id)
        .single();

      if (existingVote) {
        // Remove existing vote
        if (existingVote.vote_type === voteType) {
          const { error } = await supabase
            .from("discussion_votes")
            .delete()
            .eq("discussion_id", discussionId)
            .eq("user_id", user.id);
          if (error) throw error;
          return { action: "remove", prevVote: voteType };
        } else {
          // Switch vote
          const { error } = await supabase
            .from("discussion_votes")
            .update({ vote_type: voteType })
            .eq("discussion_id", discussionId)
            .eq("user_id", user.id);
          if (error) throw error;
          return { action: "switch", prevVote: existingVote.vote_type, newVote: voteType };
        }
      } else {
        // Add new vote
        const { error } = await supabase
          .from("discussion_votes")
          .insert({
            discussion_id: discussionId,
            user_id: user.id,
            vote_type: voteType
          });
        if (error) throw error;
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

      queryClient.invalidateQueries({ queryKey: ["user-vote", discussionId] });
    }
  });

  const handleVote = (voteType: "up" | "down") => {
    voteMutation.mutate(voteType);
  };

  const score = upvotes - downvotes;

  return (
    <div className="flex flex-col items-center gap-1 min-w-[60px]">
      <Button
        variant={currentVote === "up" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleVote("up")}
        className="h-8 w-8 p-0 hover:bg-muted/50"
      >
        <ThumbsUp className="w-4 h-4" />
      </Button>

      <span className={`text-sm font-medium ${score >= 0 ? "text-green-600" : "text-red-600"}`}>
        {score}
      </span>

      <Button
        variant={currentVote === "down" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleVote("down")}
        className="h-8 w-8 p-0 hover:bg-muted/50"
      >
        <ThumbsDown className="w-4 h-4" />
      </Button>
    </div>
  );
}
