"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Prefill email from query parameter if provided
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (res.error) {
        setError(res.error.message);
      } else {
        try {
          const ts = new Date().toISOString();
          localStorage.setItem("prospect:last_login", ts);
        } catch (e) {
          // ignore
        }

        try {
          const { upsertProfileLastLogin } = await import("../../lib/profile");
          if (res.data?.user) {
            await upsertProfileLastLogin(
              res.data.user.id,
              res.data.user.email ?? undefined,
            );
          }
        } catch (clientErr) {
          try {
            const token = res.data?.session?.access_token ?? null;
            if (token) {
              const r = await fetch("/api/profile", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ last_login: new Date().toISOString() }),
              });
              if (!r.ok)
                console.error("profile API fallback failed", await r.text());
            }
          } catch (e) {
            console.error("profile fallback error", e);
          }
        }

        router.push("/");
      }
    } catch (e) {
      const ex = e as { message?: string };
      setError(ex?.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-md p-8 bg-gray-900 border border-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-[#e0a815] mb-2">Welcome back</h2>
        <p className="text-sm text-gray-400 mb-6">
          Sign in to your Prospect account
        </p>

        <div className="space-y-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#e0a815]"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#e0a815]"
          />
          {error && <div className="text-sm text-red-500">{error}</div>}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full p-3 bg-[#e0a815] text-black rounded font-semibold hover:brightness-95"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-400">
          Don't have an account?{" "}
          <a href="/signup" className="text-[#e0a815] font-medium">
            Create one
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
