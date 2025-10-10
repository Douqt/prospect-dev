"use client";
import React, { useState, useEffect } from "react";
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
  const [darkMode, setDarkMode] = useState(false);
  const router = useRouter();

  // Dark mode detection
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
    
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setDarkMode(isDark);
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });
    
    return () => observer.disconnect();
  }, []);

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
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md p-8 rounded-lg shadow-lg bg-popover border border-border">
        <h2 className="text-2xl font-bold mb-2 text-primary">
          Create your account
        </h2>
        <p className="text-sm mb-6 text-muted-foreground">
          Start your Prospect journey
        </p>

        <div className="space-y-4">
          <input
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(e.target.value)
            }
            placeholder="Email"
            className="w-full p-3 rounded bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
            placeholder="Password"
            type="password"
            className="w-full p-3 rounded bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {error && <div className="text-sm text-red-500">{error}</div>}
          {isExisting && (
            <div className="text-sm text-muted-foreground">
              <div className="mt-2 flex items-center justify-between gap-2">
                <a
                  href={`/login?email=${encodeURIComponent(email)}`}
                  className="text-primary hover:underline"
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
                  className="text-sm text-primary hover:underline disabled:opacity-50"
                >
                  {resetLoading ? "Sending..." : "Reset password"}
                </button>
              </div>
              {resetMsg && (
                <div className="mt-2 text-sm text-green-500">{resetMsg}</div>
              )}
            </div>
          )}
          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full p-3 rounded font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
