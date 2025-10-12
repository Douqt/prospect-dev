"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { GridBackground } from "@/components/GridBackground";
import { UsernameInput } from "@/components/UsernameInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AvatarUpload } from "@/components/AvatarUpload";
import { useTheme } from 'next-themes';
import { Switch } from "@/components/ui/switch";
import { Moon, Sun } from 'lucide-react';

interface Profile {
  id: string;
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  dark_mode?: boolean;
}

export default function SettingsPage() {
  const { setTheme, resolvedTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [username, setUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('theme', resolvedTheme || 'system');
    }
  }, [resolvedTheme, mounted]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url, dark_mode")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setDisplayName(data?.display_name || "");
      setBio(data?.bio || "");
      setAvatarUrl(data?.avatar_url || "");
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    try {
      // Also save username if it was changed
      const usernameUpdate = newUsername && newUsername !== profile.username ?
        { username: newUsername.toLowerCase() } : {};

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          bio: bio.slice(0, 160), // Enforce limit
          avatar_url: avatarUrl || null,
          ...usernameUpdate,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
      setNewUsername(""); // Clear the new username state
      loadProfile(); // Reload to update the current username

      // Notify navbar to refresh profile data
      try {
        localStorage.setItem('profile_updated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('profileUpdated'));
      } catch (e) {
        console.debug("Could not trigger profile update notification:", e);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  const handleSaveUsername = async () => {
    if (!profile || !newUsername) return;

    // Check if username is available
    try {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", newUsername.toLowerCase())
        .single();

      if (data) {
        toast.error("Username is already taken");
        return;
      }
    } catch (error) {
      // If we get here, it means no username found, which is good
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: newUsername.toLowerCase(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast.success("Username updated successfully");
      setNewUsername("");
      loadProfile(); // Reload profile to get updated username
    } catch (error) {
      console.error("Error updating username:", error);
      toast.error("Failed to update username");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      <Sidebar />
      <GridBackground />
      <Navbar />
      <main className="relative z-10 pt-24 pl-64 pr-6">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Profile Settings */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground">Profile</h2>

              {/* Avatar Section */}
              <div>
                <h3 className="text-lg font-medium text-foreground mb-3">Avatar</h3>
                <AvatarUpload
                  currentUrl={avatarUrl}
                  onUpload={(url) => {
                    setAvatarUrl(url);
                    handleSave();
                  }}
                />
              </div>

              {/* Username Section */}
              <div>
                <h3 className="text-lg font-medium text-foreground mb-3">Username</h3>
                {profile && (
                  <UsernameInput
                    currentUsername={profile.username || ""}
                    onChange={(value) => setNewUsername(value)}
                    allowEdit
                    disabled={false}
                  />
                )}
              </div>

              {/* Display Name */}
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-foreground mb-2">
                  Display Name
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

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-foreground mb-2">
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
            </div>

            {/* Preferences Settings */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground">Preferences</h2>

              {/* Theme Toggle Section */}
              <div>
                <h3 className="text-lg font-medium text-foreground mb-3">Appearance</h3>
                <div className="space-y-4">
                  {profile && (
                    <ThemeToggle />
                  )}


                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-border">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
