"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { timeAgo } from "../lib/time";
import { useTheme } from "@/hooks/useTheme";

export default function NavBar() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<{
    avatar_url?: string | null;
    last_login?: string | null;
  } | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [localLastLogin, setLocalLastLogin] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const s = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Initialize user session - check if already available first
    const initUser = async () => {
      try {
        // First check if we already have a current session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.debug("Session error:", error);
          setIsLoading(false);
          return;
        }
        setUser(session?.user ?? null);
        setIsLoading(false);
      } catch (e) {
        console.debug("failed loading user session", e);
        setIsLoading(false);
      }
    };

    initUser();

    return () => s.data?.subscription?.unsubscribe();
  }, []);



  // Fetch profile data when user changes
  useEffect(() => {
    if (!user?.id) {
      setDisplayName(null);
      setProfile(null);
      return;
    }

    const fetchProfile = async () => {
      try {
        // Use the server API for profile data
        const token = (await supabase.auth.getSession()).data.session
          ?.access_token;
        if (!token) {
          // Fallback to client-side fetch for display name
          const displayResult = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .single();
          setDisplayName(displayResult.data?.display_name || null);
          setProfile(null);
          return;
        }

        const r = await fetch(`/api/profile?userId=${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!r.ok) {
          // Fallback to client-side
          const displayResult = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .single();
          setDisplayName(displayResult.data?.display_name || null);
          setProfile(null);
        } else {
          const json = await r.json();
          const profileData = json.profile;
          setProfile(profileData || null);
          setDisplayName(profileData?.display_name || null);
        }
      } catch (error) {
        console.debug("Could not fetch profile:", error);
        // Fallback to just display name
        try {
          const { data } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .single();
          setDisplayName(data?.display_name || null);
          setProfile(null);
        } catch (fallbackError) {
          console.debug('Fallback display name fetch failed:', fallbackError);
          setDisplayName(null);
          setProfile(null);
        }
      }
    };

    fetchProfile();
  }, [user?.id]);

  // Listen for profile updates (e.g., from settings page)
  useEffect(() => {
    const handleProfileUpdate = () => {
      // Refetch profile when settings are updated
      if (user?.id) {
        const refetchProfile = async () => {
          try {
            const token = (await supabase.auth.getSession()).data.session
              ?.access_token;
            if (token) {
              const r = await fetch(`/api/profile?userId=${user.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (r.ok) {
                const json = await r.json();
                const profileData = json.profile;
                setProfile(profileData || null);
                setDisplayName(profileData?.display_name || null);
              }
            }
          } catch (error) {
            console.debug('Profile refetch failed:', error);
          }
        };
        refetchProfile();
      }
    };

    // Listen for custom event or storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'profile_updated') {
        handleProfileUpdate();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [user?.id]);

  useEffect(() => {
    try {
      const v = localStorage.getItem("prospect:last_login");
      if (v) setLocalLastLogin(v);
    } catch (e) {
      /* ignore */
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen && !(event.target as Element).closest('.dropdown-container')) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    try {
      localStorage.removeItem("prospect:last_login");
    } catch (e) {
      console.debug("failed clearing local last_login", e);
    }
    window.location.href = "/";
  };

  return (
    <aside className="w-full fixed top-0 left-0 z-50 bg-background border-b border-border">
      <div className="w-full px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <img
              src="/images.png"
              alt="Prospect"
              className="h-8 w-auto filter drop-shadow-lg cursor-pointer"
            />
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-4">
          {/* Primary top links */}
          <div className="flex items-center gap-3">
            <Link href="/features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
          </div>


          {isLoading ? (
            // Show loading state while determining user session
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-foreground"
              >
                <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          ) : !user ? (
            <a
              href="/login"
              className={`px-4 py-2 rounded font-semibold text-sm transition-colors ${
                theme === 'dark'
                  ? "bg-[#e0a815] text-black hover:brightness-95"
                  : "bg-sky-400 text-white hover:bg-sky-500"
              }`}
            >
              Login/Signup
            </a>
          ) : (
            <div className="relative dropdown-container">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMenuOpen((s) => !s)}
                  className="flex items-center gap-2 focus:outline-none"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="avatar"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-foreground"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg shadow-xl z-50 bg-popover border border-border">
                  {/* User Info Section */}
                  <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="avatar"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-foreground"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {displayName || "User"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user?.email}
                        </div>
                      </div>
                    </div>
                    {(profile?.last_login ?? localLastLogin) && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Last active {timeAgo(profile?.last_login ?? localLastLogin)}
                      </div>
                    )}
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <a
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors text-foreground hover:bg-muted"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </a>
                    
                    <div className={`flex items-center justify-between px-4 py-2 ${
                      theme === 'dark'
                        ? "text-gray-200"
                        : "text-gray-700"
                    }`}>
                      <div className="flex items-center gap-3 text-sm">
                        {theme === 'dark' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        )}
                        {theme === 'dark' ? "Dark mode" : "Light mode"}
                      </div>
                      <button
                        onClick={toggleTheme}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          theme === 'dark'
                            ? "bg-[#e0a815] focus:ring-[#e0a815]"
                            : "bg-gray-200 focus:ring-sky-400"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            theme === 'dark' ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <a
                      href="/profile/edit-avatar"
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors text-foreground hover:bg-muted"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Edit Avatar
                    </a>

                    <a
                      href="/prospect-pro"
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors text-foreground hover:bg-muted"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Prospect Pro
                    </a>

                    <a
                      href="/achievements"
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors text-foreground hover:bg-muted"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Achievements
                    </a>

                    <a
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors text-foreground hover:bg-muted"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </a>
                  </div>

                  {/* Logout Section */}
                  <div className="border-t py-2 border-border">
                    <button
                      onClick={signOut}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                        theme === 'dark'
                          ? "text-red-400 hover:bg-gray-800"
                          : "text-red-600 hover:bg-gray-100"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>

        <button className="md:hidden text-foreground">{/* mobile menu */}</button>
      </div>
    </aside>
  );
}
