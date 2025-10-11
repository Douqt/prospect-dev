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

export async function upsertProfileOnSignup(userId: string, email?: string, username?: string) {
  if (!userId) return;
  try {
    await supabase.from("profiles").upsert({
      id: userId,
      email: email ?? null,
      username: username ?? null,
      display_name: username ?? null, // Set display_name to username initially
      last_login: new Date().toISOString(),
    });
  } catch (e) {
    // ignore errors; not critical for UX
    console.error("upsertProfileOnSignup error", e);
  }
}

export async function userHasProfile(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select('id') // select 1 limit 1 equivalent
      .eq("id", userId)
      .single();

    return !error && !!data;
  } catch {
    return false;
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
