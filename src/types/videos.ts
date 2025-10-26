export interface Video {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  creator: User;
  mux_asset_id: string;
  mux_playback_id: string;
  thumbnail_url: string;
  duration: number;
  views: number;
  likes: number;
  created_at: string;
  updated_at: string;
  tags: string[];
  is_liked?: boolean;
  like_count?: number;
}

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  role: "member" | "mentor" | "admin";
  bio?: string;
  created_at: string;
}

export interface Comment {
  id: string;
  content: string;
  user_id: string;
  user: User;
  video_id: string;
  parent_id?: string;
  likes: number;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
  is_liked?: boolean;
}

export interface VideoLike {
  id: string;
  user_id: string;
  video_id: string;
  created_at: string;
}

export interface VideoView {
  id: string;
  user_id?: string;
  video_id: string;
  watched_at: string;
  watch_duration?: number;
}

export interface VideoUploadRequest {
  title: string;
  description: string;
  video_file: File;
  tags: string[];
}

export interface VideoUploadResponse {
  success: boolean;
  video_id?: string;
  mux_asset_id?: string;
  mux_playback_id?: string;
  error?: string;
}

export interface VideoSearchFilters {
  query?: string;
  creator_id?: string;
  tags?: string[];
  sort_by?: "newest" | "oldest" | "most_viewed" | "most_liked";
  limit?: number;
  offset?: number;
}

export interface VideoAnalytics {
  total_views: number;
  total_likes: number;
  average_watch_time: number;
  completion_rate: number;
  daily_views: Array<{
    date: string;
    views: number;
  }>;
}

export interface AdSlot {
  id: string;
  video_id: string;
  ad_type: "preroll" | "midroll" | "postroll";
  ad_content: string;
  start_time?: number; // For midroll ads
  duration: number;
  is_active: boolean;
  created_at: string;
}
