"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Upload, X, Send } from "lucide-react";

interface CreatePostFormProps {
  category: string;
  onClose: () => void;
}

export function CreatePostForm({ category, onClose }: CreatePostFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Create post mutation with optimistic updates
  const createPostMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; imageUrl?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Must be logged in to post");

      const { data: post, error } = await supabase
        .from("discussions")
        .insert({
          title: data.title,
          content: data.content,
          category,
          user_id: user.id,
          image_url: data.imageUrl
        })
        .select()
        .single();

      if (error) throw error;
      return post;
    },
    onMutate: async (newPost) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["discussions", category] });
      await queryClient.cancelQueries({ queryKey: ["forum-stats", category] });
      await queryClient.cancelQueries({ queryKey: ["forum-stats"] });

      // Snapshot the previous values
      const previousDiscussions = queryClient.getQueryData(["discussions", category]);
      const previousForumStats = queryClient.getQueryData(["forum-stats", category]);
      const previousGeneralForumStats = queryClient.getQueryData(["forum-stats"]);

      // Get current user profile for optimistic update
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("user_id", user?.id)
        .single();

      // Optimistically update discussions list
      const optimisticPost = {
        id: `temp-${Date.now()}`, // Temporary ID
        title: newPost.title,
        content: newPost.content,
        category,
        created_at: new Date().toISOString(),
        upvotes: 0,
        downvotes: 0,
        views: 0,
        comment_count: 0,
        image_url: newPost.imageUrl,
        profiles: profile || { username: null, display_name: null, avatar_url: null },
        _count: { comments: 0 }
      };

      queryClient.setQueryData(["discussions", category], (old: any) => {
        if (!old) return [optimisticPost];
        return [optimisticPost, ...old];
      });

      // Optimistically update forum stats (increment post count)
      if (previousForumStats) {
        queryClient.setQueryData(["forum-stats", category], (old: any) => ({
          ...old,
          posts: (old?.posts || 0) + 1
        }));
      }

      // Return a context object with the snapshotted values
      return { previousDiscussions, previousForumStats, previousGeneralForumStats };
    },
    onError: (err, newPost, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousDiscussions) {
        queryClient.setQueryData(["discussions", category], context.previousDiscussions);
      }
      if (context?.previousForumStats) {
        queryClient.setQueryData(["forum-stats", category], context.previousForumStats);
      }
      if (context?.previousGeneralForumStats) {
        queryClient.setQueryData(["forum-stats"], context.previousGeneralForumStats);
      }
    },
    onSuccess: async () => {
      // Invalidate all related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["discussions", category] });
      queryClient.invalidateQueries({ queryKey: ["forum-stats", category] });
      queryClient.invalidateQueries({ queryKey: ["forum-stats"] });
      queryClient.invalidateQueries({ queryKey: ["forum-discussions"] });
      queryClient.invalidateQueries({ queryKey: ["discussions", category, "initial"] });

      // Use API route for post count updates to handle service role properly
      try {
        await fetch('/api/update-community-stats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            community_symbol: category,
            action: 'post' // This will increment the post count
          }),
        });
      } catch (error) {
        console.warn('Failed to update community stats via API:', error);
        // Non-critical error, continue with cache invalidation
      }

      onClose();
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["discussions", category] });
      queryClient.invalidateQueries({ queryKey: ["forum-stats", category] });
    }
  });

  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Must be logged in to upload");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;
      const filePath = `discussions/${fileName}`;

      const { error } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (error) throw error;

      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    }
  });

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("Image must be less than 5MB");
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      alert("Please fill in both title and content");
      return;
    }

    try {
      let imageUrl: string | undefined;

      if (imageFile) {
        imageUrl = await uploadImageMutation.mutateAsync(imageFile);
      }

      await createPostMutation.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        imageUrl
      });
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post. Please try again.");
    }
  };

  const isLoading = createPostMutation.isPending || uploadImageMutation.isPending;

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="w-8 h-8">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">Create a new post</h3>
            <p className="text-sm text-muted-foreground">
              Share your thoughts in {category}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="What's your main topic?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            placeholder="Share your detailed thoughts..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-none"
            maxLength={5000}
            required
          />
        </div>

        {/* Image upload */}
        <div className="space-y-2">
          <Label>Image (optional)</Label>
          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-full h-48 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={removeImage}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Image
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Max file size: 5MB
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !title.trim() || !content.trim()}
            className="flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {isLoading ? "Posting..." : "Post"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
