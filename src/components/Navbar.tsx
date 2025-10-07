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
            <div className="relative">
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
                <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded shadow-lg">
                  {(profile?.last_login ?? localLastLogin) && (
                    <div className="px-4 py-2 text-xs text-gray-400">
                      Signed in {timeAgo(profile?.last_login ?? localLastLogin)}
                    </div>
                  )}
                  <div className="border-t border-gray-800" />
                  <a
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
                  >
                    Profile
                  </a>
                  <button
                    onClick={signOut}
                    className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
                  >
                    Sign out
                  </button>
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
