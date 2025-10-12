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
  const [unsavedAvatarUrl, setUnsavedAvatarUrl] = useState<string | null>(null);

  // Cleanup truly unsaved avatars when component unmounts or user navigates away
  const cleanupUnsavedAvatar = async (url: string | null) => {
    if (!url) return;

    try {
      console.log('🗑️ Settings: Cleaning up unsaved avatar:', url);

      // Extract file path from Supabase URL
      const urlParts = url.split('/storage/v1/object/public/avatars/');
      if (urlParts.length === 2) {
        const filePath = urlParts[1];
        const { error } = await supabase.storage
          .from('avatars')
          .remove([filePath]);

        if (error) {
          console.debug('Could not delete unsaved avatar:', error);
        } else {
          console.log('🗑️ Settings: Successfully deleted unsaved avatar');
        }
      }
    } catch (error) {
      console.debug('Error cleaning up unsaved avatar:', error);
    }
  };

  useEffect(() => {
    setMounted(true);

    // Cleanup on component unmount
    return () => {
      if (unsavedAvatarUrl) {
        cleanupUnsavedAvatar(unsavedAvatarUrl);
      }
    };
  }, [unsavedAvatarUrl]);

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

  // Auto-save avatar immediately when uploaded
  const saveAvatarOnly = async (newAvatarUrl: string) => {
    if (!profile) return true;

    try {
      console.log("🔄 Settings: Auto-saving avatar URL:", newAvatarUrl);

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarUrl })
        .eq("id", profile.id);

      console.log("🔄 Settings: Avatar auto-save result - error:", error);

      if (error) {
        console.error("Error auto-saving avatar:", error);
        toast.error("Avatar uploaded but failed to save. Try again.");
        // Track this avatar as unsaved for cleanup
        setUnsavedAvatarUrl(newAvatarUrl);
        return false;
      }

      toast.success("Avatar updated successfully!");
      setUnsavedAvatarUrl(null); // Clear unsaved avatar (it was saved)

      // Notify navbar to refresh profile data
      try {
        localStorage.setItem('profile_updated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('profileUpdated'));
        console.log('🔄 Settings: Profile update event sent to navbar');
      } catch (e) {
        console.debug("Could not trigger profile update notification:", e);
      }

      return true;
    } catch (error) {
      console.error("Error auto-saving avatar:", error);
      toast.error("Avatar uploaded but failed to save. Try again.");
      // Track this avatar as unsaved for cleanup
      setUnsavedAvatarUrl(newAvatarUrl);
      return false;
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    try {
      // Also save username if it was changed
      const usernameUpdate = newUsername && newUsername !== profile.username ?
        { username: newUsername.toLowerCase() } : {};

      console.log("🔄 Settings: Saving profile with avatar_url:", avatarUrl);

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          bio: bio.slice(0, 160), // Enforce limit
          avatar_url: avatarUrl || profile.avatar_url || null, // Keep existing if none set
          ...usernameUpdate,
        })
        .eq("id", profile.id);

      console.log("🔄 Settings: Update result - error:", error);
      console.log("🔄 Settings: Avatar URL being saved:", avatarUrl || profile.avatar_url || null);

      if (error) throw error;

      toast.success("Profile updated successfully");
      setNewUsername(""); // Clear the new username state
      setUnsavedAvatarUrl(null); // Clear unsaved avatar (it was saved)
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
                  onUpload={async (url) => {
                    console.log('🔄 Settings: AvatarUpload onUpload called with URL:', url);

                    // Update local state immediately for UI
                    setAvatarUrl(url);
                    console.log('🔄 Settings: avatarUrl state set to:', url);

                    // Auto-save the avatar to database immediately
                    // Cleanup tracking will happen automatically if save fails
                    await saveAvatarOnly(url);
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
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
