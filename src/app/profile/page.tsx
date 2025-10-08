"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const token = (await supabase.auth.getSession()).data.session
        ?.access_token;
      if (!token) return;
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      if (!mounted) return;
      setFullName(json?.profile?.full_name ?? "");
      setAvatarUrl(json?.profile?.avatar_url ?? "");
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const save = async () => {
    setLoading(true);
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) return;
    await fetch("/api/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ full_name: fullName, avatar_url: avatarUrl }),
    });
    setLoading(false);
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden text-white">
      <Sidebar />
      <div
        className="absolute inset-0 z-0 pointer-events-none grid-background"
        style={{
          backgroundImage:
            `linear-gradient(to right, rgba(128, 128, 128, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(128, 128, 128, 0.2) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />
      <Navbar />
      <main className="relative z-10 pt-24 pl-64 pr-6">
        <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
          <div className="w-full max-w-md bg-gray-900 p-6 rounded border border-gray-800">
            <h2 className="text-lg font-semibold text-[#e0a815] mb-4">Your profile</h2>
            <div className="space-y-3">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                className="w-full p-2 bg-gray-800 rounded"
              />
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="Avatar URL"
                className="w-full p-2 bg-gray-800 rounded"
              />
              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={loading}
                  className="px-4 py-2 bg-[#e0a815] text-black rounded"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="px-4 py-2 border border-gray-700 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
