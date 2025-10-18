import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { addIndexedFilter } from "@/lib/pagination";

/**
 * Profile data structure from the database
 */
export interface Profile {
  id: string;
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  dark_mode?: boolean;
  onboarded?: boolean;
}

/**
 * Updates that can be made to a profile (excluding the ID)
 */
export type ProfileUpdate = Partial<Omit<Profile, "id">>;

/**
 * Return type for the useProfile hook
 */
export interface UseProfileReturn {
  profile: Profile | null | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  updateProfile: (updates: ProfileUpdate) => Promise<Profile>;
  isUpdating: boolean;
}

/**
 * Custom hook for managing user profile data
 * Provides profile fetching, updating, and caching functionality
 * Uses React Query for state management and Supabase for data persistence
 *
 * @param userId - The ID of the user whose profile to manage
 * @returns Profile data and management functions
 */
export function useProfile(userId?: string): UseProfileReturn {
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;

      // Build query with indexed filter for optimal performance
      let query = supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url, dark_mode, onboarded");

      // Apply indexed filter for efficient user_id lookup
      query = addIndexedFilter(query, 'profiles', { user_id: userId });

      const { data, error } = await query.single();

      if (error) {
        // Handle case where profile doesn't exist yet
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as Profile;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (garbage collection time)
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: ProfileUpdate): Promise<Profile> => {
      if (!userId) throw new Error("No user ID provided for profile update");

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => {
      // Invalidate and refetch profile data after successful update
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });

  return {
    profile,
    isLoading,
    error,
    refetch,
    updateProfile: updateProfile.mutateAsync,
    isUpdating: updateProfile.isPending,
  };
}
