import { supabase } from "./supabaseClient";

/**
 * Updates a user's last login timestamp in their profile
 * Silently handles errors as this is not critical for UX
 * @param userId - The user's unique identifier
 * @param email - Optional email to update
 */
export async function upsertProfileLastLogin(userId: string, email?: string): Promise<void> {
  if (!userId) return;

  try {
    await supabase.from("profiles").upsert({
      id: userId,
      email: email ?? null,
      last_login: new Date().toISOString(),
      // Keep existing values for other fields, only update last_login
    });
  } catch (error) {
    // Log error but don't throw - not critical for UX
    console.error("Failed to update profile last login:", error);
  }
}

/**
 * Checks if a user has a profile in the database
 * @param userId - The user's unique identifier
 * @returns Promise<boolean> indicating if profile exists
 */
export async function userHasProfile(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select('id') // Minimal select for existence check
      .eq("id", userId)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * Fetches basic profile information for a user
 * @param userId - The user's unique identifier
 * @returns Promise with avatar_url and last_login or null if not found/error
 */
export async function fetchProfile(userId: string) {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_url, last_login")
      .eq("id", userId)
      .single();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}
