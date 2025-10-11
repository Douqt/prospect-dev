"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
}

const steps: OnboardingStep[] = [
  { id: 1, title: "Pick a Username", description: "Choose a unique username for your profile" },
  { id: 2, title: "About You", description: "Tell us a bit about yourself" },
  { id: 3, title: "Theme Preference", description: "Choose your preferred theme" },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [isFromEmailConfirmation, setIsFromEmailConfirmation] = useState(false);
  const [isCrossDevice, setIsCrossDevice] = useState(false);
  const [emailFromUrl, setEmailFromUrl] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [loading, setLoading] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);

  const router = useRouter();

  // Extract callback URL, cross-device flags, and email from search params on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const callback = searchParams.get('callbackUrl');
    const fromEmail = searchParams.get('from') === 'email_confirmation';
    const crossDevice = searchParams.get('cross_device') === 'true';
    const encodedEmail = searchParams.get('email');

    setCallbackUrl(callback);
    setIsFromEmailConfirmation(fromEmail);
    setIsCrossDevice(crossDevice);

    // Decode the email if it exists in the URL
    if (encodedEmail) {
      try {
        setEmailFromUrl(decodeURIComponent(encodedEmail));
      } catch (error) {
        console.error('Failed to decode email parameter:', error);
        setEmailFromUrl(null);
      }
    }

    // If from email confirmation, show a toast to indicate this
    if (fromEmail) {
      toast.success(
        crossDevice
          ? "Email confirmed! Continuing onboarding on this device."
          : "Email confirmed! Let's complete your profile."
      );
    }
  }, []);

  // Check username availability with debouncing
  useEffect(() => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        // Check if username exists
        const { data } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", username.toLowerCase())
          .single();

        setUsernameAvailable(!data);
      } catch (error) {
        setUsernameAvailable(true);
      } finally {
        setCheckingUsername(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username]);

  const handleNext = () => {
    if (currentStep < steps.length) {
      // When moving from step 1 to step 2, set display name to username by default
      if (currentStep === 1 && username && !displayName.trim()) {
        setDisplayName(username);
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Update profile with onboarding data - ensure all fields are present
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: emailFromUrl || user.email, // Use decoded email from URL else user email
          username: username.toLowerCase(),
          display_name: displayName || username, // Fallback to username if displayName is empty
          bio: bio || null,
          avatar_url: avatarUrl || null,
          dark_mode: darkMode,
          onboarded: true,
          last_login: new Date().toISOString(), // Update login time
          updated_at: new Date().toISOString(), // Update timestamp
        });

      if (error) throw error;

      // Save theme preference to localStorage
      localStorage.setItem("theme", darkMode ? "dark" : "light");

      toast.success("Welcome to Prospect!");

      // Redirect to callback URL if provided, otherwise go to home
      const redirectUrl = callbackUrl || '/';
      router.push(redirectUrl);
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Failed to complete onboarding. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return username.length >= 3 && username.length <= 20 && usernameAvailable === true;
      case 2:
        return displayName.trim().length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Cross-device indicator */}
      {isFromEmailConfirmation && (
        <div className="mb-4 max-w-2xl w-full">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  {isCrossDevice
                    ? "Email confirmed on another device! Continue onboarding here."
                    : "Email confirmed! Let's complete your profile."
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl bg-card border border-border rounded-lg shadow-lg">
        {/* Header */}
        <div className="p-8 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">Welcome to Prospect</h1>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {steps.length}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>

          <div className="mt-4">
            <h2 className="text-xl font-semibold text-foreground">{steps[currentStep - 1].title}</h2>
            <p className="text-muted-foreground">{steps[currentStep - 1].description}</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-8">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium mb-2">
                  Username *
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a unique username"
                  className="w-full p-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  maxLength={20}
                />
                {checkingUsername && (
                  <p className="text-sm text-muted-foreground mt-1">Checking availability...</p>
                )}
                {usernameAvailable === true && (
                  <p className="text-sm text-green-500 mt-1">✓ Username available</p>
                )}
                {usernameAvailable === false && (
                  <p className="text-sm text-red-500 mt-1">✗ Username not available</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  3-20 characters, letters and numbers only
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium mb-2">
                  Display Name *
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full p-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                />
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium mb-2">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  maxLength={160}
                  className="w-full p-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {bio.length}/160 characters
                </p>
              </div>

              <div>
                <label htmlFor="avatarUrl" className="block text-sm font-medium mb-2">
                  Avatar URL (optional)
                </label>
                <input
                  id="avatarUrl"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full p-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <p className="mb-4 text-sm font-medium">Choose your preferred theme:</p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      id="light"
                      type="radio"
                      name="theme"
                      checked={!darkMode}
                      onChange={() => setDarkMode(false)}
                      className="h-4 w-4 text-primary focus:ring-ring"
                    />
                    <label htmlFor="light" className="text-sm font-medium">
                      Light Theme
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      id="dark"
                      type="radio"
                      name="theme"
                      checked={darkMode}
                      onChange={() => setDarkMode(true)}
                      className="h-4 w-4 text-primary focus:ring-ring"
                    />
                    <label htmlFor="dark" className="text-sm font-medium">
                      Dark Theme
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {currentStep < steps.length ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={loading || !canProceed()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Completing..." : "Get Started"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
