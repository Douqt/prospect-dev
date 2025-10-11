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

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignup = async () => {
    // Basic input validation
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!isValidEmail(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }
    if (!password.trim()) {
      setError("Password is required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);
    setIsExisting(false);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/confirmed`,
        },
      });

      console.log("Signup response - data:", data);
      console.log("Signup response - error:", error);

      if (error) {
        const msg = error.message;

        // Check for various "already exists" error patterns
        if (
          msg.includes("already registered") ||
          msg.includes("already exists") ||
          msg.includes("user already registered") ||
          msg.includes("duplicate") ||
          msg.includes("email already")
        ) {
          setError("An account with this email already exists. Please sign in or reset your password.");
          setIsExisting(true);
          return; // Exit early - don't throw, just show error
        }

        // Handle other types of errors
        throw new Error(msg);
      }

      // Success case: user is created, awaiting email confirmation
      if (data?.user) {
        // Note: session is null when email confirmation is enabled (normal behavior)
        try {
          const { upsertProfileLastLogin } = await import("../../lib/profile");
          await upsertProfileLastLogin(
            data.user.id,
            data.user.email ?? undefined,
          );
        } catch (profileErr) {
          console.error("Profile creation warning (non-critical):", profileErr);
          // Don't throw here - profile creation failure shouldn't block signup
        }

        // Navigate to email confirmation page
        router.push("/auth/check-email");
      } else {
        // Unexpected case
        throw new Error("Signup completed but no user data returned");
      }
    } catch (err) {
      const error = err as { message?: string };
      setError(error?.message || "Failed to create account");
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

        <form onSubmit={(e) => { e.preventDefault(); handleSignup(); }} className="space-y-4">
          <input
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setEmail(e.target.value);
              if (error) setError(null); // Clear error when user starts typing
            }}
            placeholder="Email"
            type="email"
            className="w-full p-3 rounded bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            autoComplete="email"
          />
          <input
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setPassword(e.target.value);
              if (error) setError(null); // Clear error when user starts typing
            }}
            placeholder="Password"
            type="password"
            className="w-full p-3 rounded bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            autoComplete="new-password"
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
            type="submit"
            disabled={loading}
            className="w-full p-3 rounded font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

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
