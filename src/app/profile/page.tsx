"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

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
    <div className="min-h-screen p-8 bg-black text-white">
      <div className="max-w-md mx-auto bg-gray-900 p-6 rounded border border-gray-800">
        <h2 className="text-lg font-semibold text-[#e0a815] mb-4">
          Your profile
        </h2>
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
  );
}
