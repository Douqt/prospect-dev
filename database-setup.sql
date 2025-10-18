-- Database setup script for community features
-- Run this in your Supabase SQL editor or psql

-- Create community_memberships table
CREATE TABLE IF NOT EXISTS community_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_symbol TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure a user can only follow a community once
  CONSTRAINT unique_user_community UNIQUE (user_id, community_symbol)
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_community_memberships_user_id
ON community_memberships (user_id);

CREATE INDEX IF NOT EXISTS idx_community_memberships_community_symbol
ON community_memberships (community_symbol);

CREATE INDEX IF NOT EXISTS idx_community_memberships_created_at
ON community_memberships (created_at DESC);

-- Create community_stats table for caching member/post counts
CREATE TABLE IF NOT EXISTS community_stats (
  community_symbol TEXT PRIMARY KEY,
  member_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  last_activity TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for community_stats
CREATE INDEX IF NOT EXISTS idx_community_stats_member_count
ON community_stats (member_count DESC);

CREATE INDEX IF NOT EXISTS idx_community_stats_post_count
ON community_stats (post_count DESC);

-- Enable Row Level Security (RLS) on community_memberships
ALTER TABLE community_memberships ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for community_memberships
-- Users can only see/modify their own memberships
CREATE POLICY "Users can view own memberships"
ON community_memberships FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memberships"
ON community_memberships FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memberships"
ON community_memberships FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS on community_stats (public read access)
ALTER TABLE community_stats ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read community stats
CREATE POLICY "Anyone can view community stats"
ON community_stats FOR SELECT
USING (true);

-- Only allow service role to modify community stats
CREATE POLICY "Service role can modify community stats"
ON community_stats FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create function to automatically update community_stats when discussions are created
CREATE OR REPLACE FUNCTION update_community_stats_on_discussion()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update community stats
  INSERT INTO community_stats (community_symbol, post_count, last_activity, updated_at)
  VALUES (NEW.category, 1, NOW(), NOW())
  ON CONFLICT (community_symbol)
  DO UPDATE SET
    post_count = community_stats.post_count + 1,
    last_activity = NOW(),
    updated_at = NOW();

  -- Also invalidate the cache for this community
  -- Note: This is a simple notification approach - in production you might want to use a more sophisticated cache invalidation

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update stats when discussions are created
DROP TRIGGER IF EXISTS trigger_update_community_stats_on_discussion ON discussions;
CREATE TRIGGER trigger_update_community_stats_on_discussion
  AFTER INSERT ON discussions
  FOR EACH ROW
  EXECUTE FUNCTION update_community_stats_on_discussion();

-- Ensure the trigger is active by checking if it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_update_community_stats_on_discussion'
  ) THEN
    RAISE EXCEPTION 'Trigger trigger_update_community_stats_on_discussion was not created successfully';
  END IF;
END $$;

-- Create function to automatically update community_stats when memberships change
CREATE OR REPLACE FUNCTION update_community_stats_on_membership()
RETURNS TRIGGER AS $$
DECLARE
  community_sym TEXT;
BEGIN
  -- Get the community symbol from the operation
  IF TG_OP = 'INSERT' THEN
    community_sym := NEW.community_symbol;
  ELSIF TG_OP = 'DELETE' THEN
    community_sym := OLD.community_symbol;
  ELSE
    community_sym := NEW.community_symbol;
  END IF;

  -- Update member count
  UPDATE community_stats
  SET
    member_count = (
      SELECT COUNT(*)
      FROM community_memberships
      WHERE community_symbol = community_sym
    ),
    updated_at = NOW()
  WHERE community_symbol = community_sym;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update member count when memberships change
DROP TRIGGER IF EXISTS trigger_update_community_stats_on_membership ON community_memberships;
CREATE TRIGGER trigger_update_community_stats_on_membership
  AFTER INSERT OR UPDATE OR DELETE ON community_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_community_stats_on_membership();

-- Insert initial community stats for existing discussions
INSERT INTO community_stats (community_symbol, post_count, last_activity, updated_at)
SELECT
  category as community_symbol,
  COUNT(*) as post_count,
  MAX(created_at) as last_activity,
  NOW() as updated_at
FROM discussions
WHERE category IS NOT NULL
GROUP BY category
ON CONFLICT (community_symbol)
DO UPDATE SET
  post_count = EXCLUDED.post_count,
  last_activity = EXCLUDED.last_activity,
  updated_at = NOW();

-- Update member counts for existing memberships
UPDATE community_stats
SET
  member_count = (
    SELECT COUNT(*)
    FROM community_memberships cm
    WHERE cm.community_symbol = community_stats.community_symbol
  ),
  updated_at = NOW();

-- Create a function to manually refresh community stats (for maintenance)
CREATE OR REPLACE FUNCTION refresh_community_stats()
RETURNS void AS $$
BEGIN
  -- Refresh post counts
  UPDATE community_stats
  SET
    post_count = (
      SELECT COUNT(*)
      FROM discussions d
      WHERE d.category = community_stats.community_symbol
    ),
    updated_at = NOW();

  -- Refresh member counts
  UPDATE community_stats
  SET
    member_count = (
      SELECT COUNT(*)
      FROM community_memberships cm
      WHERE cm.community_symbol = community_stats.community_symbol
    ),
    updated_at = NOW()
  WHERE member_count != (
    SELECT COUNT(*)
    FROM community_memberships cm2
    WHERE cm2.community_symbol = community_stats.community_symbol
  );
END;
$$ LANGUAGE plpgsql;

-- Create a test function to verify trigger functionality
CREATE OR REPLACE FUNCTION test_community_stats_trigger(test_category TEXT DEFAULT 'test')
RETURNS TABLE (
  before_count INTEGER,
  after_count INTEGER,
  trigger_worked BOOLEAN
) AS $$
DECLARE
  before_count INTEGER;
  after_count INTEGER;
BEGIN
  -- Get count before trigger
  SELECT post_count INTO before_count
  FROM community_stats
  WHERE community_symbol = test_category;

  IF NOT FOUND THEN
    before_count := 0;
  END IF;

  -- Insert a test discussion (this should trigger the update)
  INSERT INTO discussions (title, content, category, user_id)
  VALUES ('Test Post', 'Test Content', test_category, auth.uid())
  ON CONFLICT DO NOTHING;

  -- Get count after trigger
  SELECT post_count INTO after_count
  FROM community_stats
  WHERE community_symbol = test_category;

  IF NOT FOUND THEN
    after_count := 0;
  END IF;

  -- Clean up test post
  DELETE FROM discussions
  WHERE title = 'Test Post' AND content = 'Test Content' AND category = test_category;

  -- Return results
  RETURN QUERY SELECT
    before_count,
    after_count,
    (after_count = before_count + 1) as trigger_worked;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON community_stats TO authenticated, anon;
GRANT ALL ON community_memberships TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_community_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION test_community_stats_trigger() TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE community_memberships IS 'Tracks which users are following which trading communities';
COMMENT ON TABLE community_stats IS 'Cached statistics for community member and post counts';
COMMENT ON FUNCTION update_community_stats_on_discussion() IS 'Automatically updates community stats when discussions are created';
COMMENT ON FUNCTION update_community_stats_on_membership() IS 'Automatically updates community member counts when memberships change';
