"use client";
import Image from "next/image";
import Link from "next/link";
import prospectLogo from "@/assets/prospect-logo.png";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { timeAgo } from "../lib/time";

export default function NavBar() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [profile, setProfile] = useState<{
    avatar_url?: string | null;
    last_login?: string | null;
  } | null>(null);
  const [localLastLogin, setLocalLastLogin] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const s = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    // initialize
    (async () => {
      const session = await supabase.auth.getSession();
      setUser(session.data?.session?.user ?? null);
    })();
    return () => s.data?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    // fetch profile via server API using access token
    const load = async () => {
      try {
        const token = (await supabase.auth.getSession()).data.session
          ?.access_token;
        if (!token) return;
        const r = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return;
        const json = await r.json();
        setProfile(json.profile ?? null);
      } catch (e) {
        console.debug("failed loading profile", e);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    try {
      const v = localStorage.getItem("prospect:last_login");
      if (v) setLocalLastLogin(v);
    } catch (e) {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    // Initialize dark mode from localStorage or system preference
    const savedDarkMode = localStorage.getItem("prospect:dark_mode");
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === "true");
    } else {
      setDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  useEffect(() => {
    // Apply dark mode to document
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("prospect:dark_mode", darkMode.toString());
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

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
    <aside className="w-full bg-black border-b border-gray-800 fixed top-0 left-0 z-50">
      <div className="w-full px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Image
              src={prospectLogo}
              alt="Prospect"
              className="h-8 w-auto filter drop-shadow-lg cursor-pointer"
            />
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-4">
          {/* Primary top links */}
          <div className="flex items-center gap-3">
            <Link href="/features" className="text-gray-300 hover:text-white">
              Features
            </Link>
            <Link href="/about" className="text-gray-300 hover:text-white">
              About
            </Link>
          </div>

          {!user ? (
            <a
              href="/login"
              className="bg-[#e0a815] text-black px-4 py-2 rounded font-semibold text-sm"
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
                    <Image
                      src={profile.avatar_url}
                      alt="avatar"
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-white">
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
                        className="text-gray-200"
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
                <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-50">
                  {/* User Info Section */}
                  <div className="px-4 py-3 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                      {profile?.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt="avatar"
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center text-white">
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
                            className="text-gray-200"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-white">
                          {user?.email?.split("@")[0] || "User"}
                        </div>
                        <div className="text-xs text-gray-400">
                          {user?.email}
                        </div>
                      </div>
                    </div>
                    {(profile?.last_login ?? localLastLogin) && (
                      <div className="mt-2 text-xs text-gray-400">
                        Last active {timeAgo(profile?.last_login ?? localLastLogin)}
                      </div>
                    )}
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <a
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </a>
                    
                    <button
                      onClick={toggleDarkMode}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 transition-colors"
                    >
                      {darkMode ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      )}
                      {darkMode ? "Light Mode" : "Dark Mode"}
                    </button>

                    <a
                      href="/profile/edit-avatar"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Edit Avatar
                    </a>

                    <a
                      href="/prospect-pro"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Prospect Pro
                    </a>

                    <a
                      href="/achievements"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Achievements
                    </a>

                    <a
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </a>
                  </div>

                  {/* Logout Section */}
                  <div className="border-t border-gray-800 py-2">
                    <button
                      onClick={signOut}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors"
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

        <button className="md:hidden text-white">{/* mobile menu */}</button>
      </div>
    </aside>
  );
}
