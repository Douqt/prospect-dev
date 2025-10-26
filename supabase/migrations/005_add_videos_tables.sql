-- Create videos table for the YouTube-style video platform
CREATE TABLE public.videos (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text NOT NULL,
  creator_id uuid NOT NULL,
  mux_asset_id text NOT NULL,
  mux_playback_id text NOT NULL,
  thumbnail_url text NOT NULL,
  duration integer NOT NULL DEFAULT 0, -- Duration in seconds
  views bigint NOT NULL DEFAULT 0,
  likes integer NOT NULL DEFAULT 0,
  tags text[] DEFAULT '{}',
  is_published boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT videos_pkey PRIMARY KEY (id),
  CONSTRAINT videos_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id),
  CONSTRAINT videos_mux_asset_id_key UNIQUE (mux_asset_id)
);

-- Create video_likes table
CREATE TABLE public.video_likes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT video_likes_pkey PRIMARY KEY (id),
  CONSTRAINT video_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT video_likes_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_video_like UNIQUE (user_id, video_id)
);

-- Create video_comments table
CREATE TABLE public.video_comments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  content text NOT NULL,
  user_id uuid NOT NULL,
  video_id uuid NOT NULL,
  parent_id uuid,
  likes integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT video_comments_pkey PRIMARY KEY (id),
  CONSTRAINT video_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT video_comments_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE,
  CONSTRAINT video_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.video_comments(id) ON DELETE CASCADE
);

-- Create video_comment_likes table
CREATE TABLE public.video_comment_likes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  comment_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT video_comment_likes_pkey PRIMARY KEY (id),
  CONSTRAINT video_comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT video_comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.video_comments(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_comment_like UNIQUE (user_id, comment_id)
);

-- Create video_views table for analytics
CREATE TABLE public.video_views (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  video_id uuid NOT NULL,
  watched_at timestamp with time zone DEFAULT now(),
  watch_duration integer DEFAULT 0, -- Watch duration in seconds
  ip_address inet,
  user_agent text,
  CONSTRAINT video_views_pkey PRIMARY KEY (id),
  CONSTRAINT video_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT video_views_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE
);

-- Create video_ad_slots table for ad integration
CREATE TABLE public.video_ad_slots (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  video_id uuid NOT NULL,
  ad_type text NOT NULL CHECK (ad_type IN ('preroll', 'midroll', 'postroll')),
  ad_content text NOT NULL, -- JSON string containing ad configuration
  start_time integer, -- For midroll ads, time in seconds
  duration integer NOT NULL DEFAULT 30, -- Ad duration in seconds
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT video_ad_slots_pkey PRIMARY KEY (id),
  CONSTRAINT video_ad_slots_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_videos_creator_id ON public.videos(creator_id);
CREATE INDEX idx_videos_created_at ON public.videos(created_at DESC);
CREATE INDEX idx_videos_views ON public.videos(views DESC);
CREATE INDEX idx_videos_likes ON public.videos(likes DESC);
CREATE INDEX idx_videos_is_published ON public.videos(is_published) WHERE is_published = true;
CREATE INDEX idx_videos_search ON public.videos USING gin(to_tsvector('english', title || ' ' || description));

CREATE INDEX idx_video_likes_video_id ON public.video_likes(video_id);
CREATE INDEX idx_video_likes_user_id ON public.video_likes(user_id);

CREATE INDEX idx_video_comments_video_id ON public.video_comments(video_id);
CREATE INDEX idx_video_comments_parent_id ON public.video_comments(parent_id);
CREATE INDEX idx_video_comments_created_at ON public.video_comments(created_at DESC);

CREATE INDEX idx_video_comment_likes_comment_id ON public.video_comment_likes(comment_id);

CREATE INDEX idx_video_views_video_id ON public.video_views(video_id);
CREATE INDEX idx_video_views_watched_at ON public.video_views(watched_at DESC);

CREATE INDEX idx_video_ad_slots_video_id ON public.video_ad_slots(video_id);
CREATE INDEX idx_video_ad_slots_ad_type ON public.video_ad_slots(ad_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_comments_updated_at BEFORE UPDATE ON public.video_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_ad_slots_updated_at BEFORE UPDATE ON public.video_ad_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_ad_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for videos table
CREATE POLICY "Anyone can view published videos" ON public.videos
  FOR SELECT USING (is_published = true);

CREATE POLICY "Users can view their own videos" ON public.videos
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "All authenticated users can insert videos" ON public.videos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own videos" ON public.videos
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own videos" ON public.videos
  FOR DELETE USING (auth.uid() = creator_id);

CREATE POLICY "Admins can manage all videos" ON public.videos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for video_likes table
CREATE POLICY "Anyone can view video likes" ON public.video_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert likes" ON public.video_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" ON public.video_likes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for video_comments table
CREATE POLICY "Anyone can view comments on published videos" ON public.video_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.videos
      WHERE videos.id = video_comments.video_id
      AND videos.is_published = true
    )
  );

CREATE POLICY "Authenticated users can insert comments" ON public.video_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.video_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.video_comments
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for video_comment_likes table
CREATE POLICY "Anyone can view comment likes" ON public.video_comment_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert comment likes" ON public.video_comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment likes" ON public.video_comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for video_views table
CREATE POLICY "Anyone can insert views" ON public.video_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own views" ON public.video_views
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Video creators can view views on their videos" ON public.video_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.videos
      WHERE videos.id = video_views.video_id
      AND videos.creator_id = auth.uid()
    )
  );

-- RLS Policies for video_ad_slots table
CREATE POLICY "Anyone can view active ad slots" ON public.video_ad_slots
  FOR SELECT USING (is_active = true);

CREATE POLICY "Video creators can manage ad slots for their videos" ON public.video_ad_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.videos
      WHERE videos.id = video_ad_slots.video_id
      AND videos.creator_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all ad slots" ON public.video_ad_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create function to increment video views
CREATE OR REPLACE FUNCTION increment_video_views(video_id_param uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.video_views (video_id, user_id, ip_address)
  VALUES (video_id_param, auth.uid(), inet_client_addr())
  ON CONFLICT DO NOTHING;

  UPDATE public.videos
  SET views = views + 1
  WHERE id = video_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update video likes count
CREATE OR REPLACE FUNCTION update_video_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET likes = likes + 1 WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos SET likes = likes - 1 WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for video likes count
CREATE TRIGGER trigger_update_video_likes_count
  AFTER INSERT OR DELETE ON public.video_likes
  FOR EACH ROW EXECUTE FUNCTION update_video_likes_count();

-- Create function to update comment likes count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.video_comments SET likes = likes + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.video_comments SET likes = likes - 1 WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment likes count
CREATE TRIGGER trigger_update_comment_likes_count
  AFTER INSERT OR DELETE ON public.video_comment_likes
  FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();
