import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

/**
 * Hook for fetching and displaying community statistics
 * Automatically refreshes when community data changes
 */
export function useCommunityStats(communitySymbol: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["community-stats", communitySymbol.toLowerCase()],
    queryFn: async () => {
      console.log(`Fetching stats for ${communitySymbol}`);

      const { data, error } = await supabase
        .from("community_stats")
        .select("member_count, post_count, last_activity")
        .eq("community_symbol", communitySymbol.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error("Error fetching community stats:", error);
        return { members: 0, posts: 0, lastActivity: null };
      }

      return {
        members: data?.member_count || 0,
        posts: data?.post_count || 0,
        lastActivity: data?.last_activity || null
      };
    },
    staleTime: 60000, // Cache for 1 minute
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook for displaying formatted member count
 */
export function useFormattedMemberCount(communitySymbol: string) {
  const { data: stats } = useCommunityStats(communitySymbol);

  if (!stats?.members) return "0";

  if (stats.members >= 1000000) {
    return `${(stats.members / 1000000).toFixed(1)}M`;
  } else if (stats.members >= 1000) {
    return `${(stats.members / 1000).toFixed(1)}K`;
  } else {
    return stats.members.toString();
  }
}

/**
 * Hook for displaying formatted post count
 */
export function useFormattedPostCount(communitySymbol: string) {
  const { data: stats } = useCommunityStats(communitySymbol);
  return (stats?.posts || 0).toString();
}

/**
 * Utility function to manually refresh community stats
 */
export function refreshCommunityStats(communitySymbol: string) {
  const queryClient = useQueryClient();
  queryClient.invalidateQueries({ queryKey: ["community-stats", communitySymbol.toLowerCase()] });
  queryClient.invalidateQueries({ queryKey: ["forum-stats"] });
  queryClient.invalidateQueries({ queryKey: ["top-communities"] });
}
