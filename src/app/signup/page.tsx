"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExisting, setIsExisting] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleSignup = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      console.log("Signup response - data:", data);
      console.log("Signup response - error:", error);
      
      // Check if user already exists (no error but no session means existing user)
      if (!error && data?.user && !data?.session) {
        setError(
          "An account with this email already exists. Please sign in or reset your password.",
        );
        setIsExisting(true);
        setLoading(false);
        return; // Exit early - don't proceed with signup flow
      }
      
      if (error) {
        const msg = (error?.message ?? "").toString();
        console.log("Signup error:", error);
        console.log("Error message:", msg);
        
        if (
          /already registered|already exists|user already registered|duplicate|email.*already/i.test(
            msg,
          )
        ) {
          setError(
            "An account with this email already exists. Please sign in or reset your password.",
          );
          setIsExisting(true);
          setLoading(false);
          return; // Exit early - don't proceed with signup flow
        }
        throw error;
      }

      // Only proceed with signup flow if no error occurred
      // If sign up created a session, upsert the profile last_login
      if (data?.user) {
        try {
          const { upsertProfileLastLogin } = await import("../../lib/profile");
          await upsertProfileLastLogin(
            data.user.id,
            data.user.email ?? undefined,
          );
        } catch (clientErr) {
          try {
            const token = data.session?.access_token ?? null;
            if (token) {
              await fetch("/api/profile", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  last_login: new Date().toISOString(),
                  email: data.user.email ?? null,
                }),
              });
            }
          } catch (e) {
            console.error("profile fallback error", e);
          }
        }
        
        // Only navigate to check-email if signup was successful (no error)
        router.push("/auth/check-email");
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || String(err) || "Failed to send verification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-md p-8 bg-gray-900 border border-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-[#e0a815] mb-2">
          Create your account
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Start your Prospect journey
        </p>

        <div className="space-y-4">
          <input
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(e.target.value)
            }
            placeholder="Email"
            className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#e0a815]"
          />
          <input
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
            placeholder="Password"
            type="password"
            className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#e0a815]"
          />
          {error && <div className="text-sm text-red-500">{error}</div>}
          {isExisting && (
            <div className="text-sm text-gray-300">
              <div className="mt-2 flex items-center justify-between gap-2">
                <a
                  href={`/login?email=${encodeURIComponent(email)}`}
                  className="text-[#e0a815]"
                >
                  Sign in
                </a>
                <button
                  onClick={async () => {
                    setResetLoading(true);
                    setResetMsg(null);
                    try {
                      const { data, error } =
                        await supabase.auth.resetPasswordForEmail(email);
                      if (error) {
                        setResetMsg("Failed to send password reset email.");
                      } else {
                        setResetMsg(
                          "Password reset email sent. Check your inbox.",
                        );
                      }
                    } catch (e) {
                      setResetMsg("Failed to send password reset email.");
                    } finally {
                      setResetLoading(false);
                    }
                  }}
                  disabled={resetLoading || !email}
                  className="text-sm text-[#e0a815] underline"
                >
                  {resetLoading ? "Sending..." : "Reset password"}
                </button>
              </div>
              {resetMsg && (
                <div className="mt-2 text-sm text-green-400">{resetMsg}</div>
              )}
            </div>
          )}
          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full p-3 bg-[#e0a815] text-black rounded font-semibold hover:brightness-95"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <a href="/login" className="text-[#e0a815] font-medium">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
