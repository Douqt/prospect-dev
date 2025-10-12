"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

interface AvatarUploadProps {
  currentUrl?: string;
  onUpload?: (url: string) => void;
}

export function AvatarUpload({ currentUrl, onUpload }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user's avatar on mount if not provided
  useEffect(() => {
    if (!avatarUrl) {
      const fetchAvatar = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();

          if (profile?.avatar_url) {
            setAvatarUrl(profile.avatar_url);
          }
        } catch (error) {
          console.debug('Failed to fetch avatar:', error);
        }
      };

      fetchAvatar();
    }
  }, [avatarUrl]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const deleteOldAvatar = async (avatarUrl: string) => {
    try {
      // Extract file path from Supabase public URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/avatars/...filepath...
      const urlParts = avatarUrl.split('/storage/v1/object/public/avatars/');
      if (urlParts.length === 2) {
        const filePath = urlParts[1]; // This will be "avatars/filename.ext"
        const { error } = await supabase.storage
          .from('avatars')
          .remove([filePath]);

        if (error && error.message !== 'Object not found') {
          // Only log error if it's not "Object not found" (file might already be deleted)
          console.debug('Could not delete old avatar:', error);
        }
      }
    } catch (error) {
      console.debug('Error deleting old avatar:', error);
      // Don't throw - we don't want this to block the new upload
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Delete old avatar if it exists
      if (avatarUrl) {
        await deleteOldAvatar(avatarUrl);
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!data.publicUrl) throw new Error("Failed to get public URL");

      // Update local state and call onUpload callback (parent will handle DB save)
      setAvatarUrl(data.publicUrl);
      onUpload?.(data.publicUrl);
      toast.success("Avatar uploaded successfully! Save your profile to apply changes.");
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!avatarUrl) return;

    try {
      // Update local state and call callback (parent will handle DB save)
      setAvatarUrl(null);
      onUpload?.("");
      toast.success("Avatar removed! Save your profile to apply changes.");
    } catch (error) {
      console.error("Error removing avatar:", error);
      toast.error("Failed to remove avatar");
    }
  };

  return (
    <div className="flex items-center space-x-4">
      {/* Avatar Preview */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-2 border-border overflow-hidden bg-muted">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="50"
                height="50"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-foreground"
              >
                <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
        </div>
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      {/* Upload Button */}
      <div className="flex flex-col space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={handleFileSelect}
          disabled={uploading}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? "Uploading..." : "Change Avatar"}
        </button>

        {avatarUrl && (
          <button
            onClick={handleRemove}
            className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
