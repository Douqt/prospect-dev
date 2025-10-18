"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, UserCheck } from "lucide-react";

export default function FollowForumButton({ stockSymbol }: { stockSymbol: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  // Force refresh on mount to ensure correct state
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["follow-status", stockSymbol] });
  }, [stockSymbol, queryClient]);

  // Simple follow status check
  const { data: isFollowing = false, isLoading, error } = useQuery({
    queryKey: ["follow-status", stockSymbol],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      console.log(`Checking if user ${user.id} follows ${stockSymbol}`);

      const { data, error } = await supabase
        .from("community_memberships")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("community_symbol", stockSymbol.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error("Query error:", error);
        return false;
      }

      const following = !!data;
      console.log(`User ${user.id} follows ${stockSymbol}: ${following}`);
      return following;
    },
  });

  const handleFollowToggle = async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Sign in required", variant: "destructive" });
      setIsUpdating(false);
      return;
    }

    try {
      // Create admin client for RPC calls that need service role
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Use anon key for client-side
      );

      if (isFollowing) {
        // Unfollow: decrement count and delete membership
        console.log(`Unfollowing ${stockSymbol} for user ${user.id}`);

        // Use API route for unfollow to handle service role properly
        const response = await fetch('/api/update-community-stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            community_symbol: stockSymbol,
            action: 'unfollow'
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update community stats');
        }

        const { error: deleteError } = await supabase
          .from("community_memberships")
          .delete()
          .eq("user_id", user.id)
          .eq("community_symbol", stockSymbol.toLowerCase());

        if (deleteError) {
          console.error("Delete error:", deleteError);
          throw deleteError;
        }

        console.log(`Successfully unfollowed ${stockSymbol}`);
        toast({ title: `Unfollowed ${stockSymbol.toUpperCase()}` });
      } else {
        // Follow: increment count and insert membership
        console.log(`Following ${stockSymbol} for user ${user.id}`);

        // Use API route for follow to handle service role properly
        const response = await fetch('/api/update-community-stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            community_symbol: stockSymbol,
            action: 'follow'
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update community stats');
        }

        const { error: insertError } = await supabase
          .from("community_memberships")
          .insert({
            user_id: user.id,
            community_symbol: stockSymbol.toLowerCase(),
          });

        if (insertError) {
          console.error("Insert error:", insertError);
          throw insertError;
        }

        console.log(`Successfully followed ${stockSymbol}`);
        toast({ title: `Following ${stockSymbol.toUpperCase()}` });
      }

      // Force refresh all related queries to show updated counts
      queryClient.invalidateQueries({ queryKey: ["follow-status", stockSymbol] });
      queryClient.invalidateQueries({ queryKey: ["forum-stats"] });
      queryClient.invalidateQueries({ queryKey: ["top-communities"] });
      queryClient.invalidateQueries({ queryKey: ["community-stats"] });
    } catch (error) {
      console.error("Toggle error:", error);
      toast({ title: "Failed to update follow status", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mb-6">
      <Button
        size="lg"
        onClick={handleFollowToggle}
        disabled={isUpdating}
        variant={isFollowing ? "outline" : "default"}
        className={
          isFollowing
            ? "border-[#e0a815] text-[#e0a815] hover:bg-[#e0a815] hover:text-black"
            : "bg-[#e0a815] hover:bg-[#f2c74b] text-black"
        }
      >
        {isFollowing ? (
          <>
            <UserCheck className="w-4 h-4 mr-2" />
            Following {stockSymbol.toUpperCase()}
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4 mr-2" />
            Follow {stockSymbol.toUpperCase()} Forum
          </>
        )}
      </Button>
    </div>
  );
}
