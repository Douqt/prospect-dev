import { supabase } from "./supabaseClient";

export async function upsertProfileLastLogin(userId: string, email?: string) {
  if (!userId) return;
  try {
    await supabase.from("profiles").upsert({
      id: userId,
      email: email ?? null,
      last_login: new Date().toISOString(),
    });
  } catch (e) {
    // ignore errors; not critical for UX
    console.error("upsertProfileLastLogin error", e);
  }
}

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
  } catch (e) {
    return null;
  }
}
