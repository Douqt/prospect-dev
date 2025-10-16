"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, UserCheck } from "lucide-react";

interface FollowForumButtonProps {
  stockSymbol: string;
}

export default function FollowForumButton({ stockSymbol }: FollowForumButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is following this forum
  const { data: isFollowing } = useQuery({
    queryKey: ["forum-follow-status", stockSymbol],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return false;

      const { data, error } = await supabase
        .from("community_memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("community_symbol", stockSymbol)
        .single();

      if (error && (!error.code || error.code !== 'PGRST116')) { // PGRST116 is "not found"
        console.error("Error checking follow status:", error);
        return false;
      }

      return !!data;
    },
  });

  const handleFollowToggle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to follow forums.",
          variant: "destructive",
        });
        return;
      }

      if (isFollowing) {
        // Unfollow forum
        const { error } = await supabase
          .from("community_memberships")
          .delete()
          .eq("user_id", user.id)
          .eq("community_symbol", stockSymbol);

        if (error) throw error;

        toast({
          title: "Unfollowed Forum",
          description: `You are no longer following ${stockSymbol.toUpperCase()}.`,
        });
      } else {
        // Follow forum
        const { error } = await supabase
          .from("community_memberships")
          .insert({
            user_id: user.id,
            community_symbol: stockSymbol,
          });

        if (error) throw error;

        toast({
          title: "Forum Followed",
          description: `You are now following ${stockSymbol.toUpperCase()}.`,
        });
      }

      // Invalidate and refetch follow status
      queryClient.invalidateQueries({ queryKey: ["forum-follow-status", stockSymbol] });

      // Also invalidate the main feed queries to show updated content
      queryClient.invalidateQueries({ queryKey: ["discussions", "dashboard"] });

      // Update community stats in database and invalidate queries
      try {
        const response = await fetch('/api/update-community-stats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            community_symbol: stockSymbol,
            action: isFollowing ? 'unfollow' : 'follow'
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Community stats updated:', result);
        } else {
          console.error('Failed to update community stats:', response.statusText);
        }
      } catch (error) {
        console.error('Error updating community stats:', error);
        // Continue with cache invalidation even if stats update fails
      }

      // Invalidate forum stats queries to update member counts
      queryClient.invalidateQueries({ queryKey: ["top-communities"] });
      queryClient.invalidateQueries({ queryKey: ["forum-stats"] });

    } catch (error) {
      console.error("Error toggling forum follow:", error);
      toast({
        title: "Error",
        description: "Failed to update forum follow status. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mb-6">
      <Button
        size="lg"
        onClick={handleFollowToggle}
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
