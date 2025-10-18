-- Supabase RPC Functions for Community Stats
-- Run this in your Supabase SQL Editor

-- Function to increment member count when following
CREATE OR REPLACE FUNCTION increment_member_count(community_sym TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO community_stats (community_symbol, member_count, updated_at)
  VALUES (community_sym, 1, NOW())
  ON CONFLICT (community_symbol)
  DO UPDATE SET
    member_count = community_stats.member_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to decrement member count when unfollowing
CREATE OR REPLACE FUNCTION decrement_member_count(community_sym TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO community_stats (community_symbol, member_count, updated_at)
  VALUES (community_sym, 0, NOW())
  ON CONFLICT (community_symbol)
  DO UPDATE SET
    member_count = GREATEST(community_stats.member_count - 1, 0),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to increment post count when posting
CREATE OR REPLACE FUNCTION increment_post_count(community_sym TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO community_stats (community_symbol, post_count, last_activity, updated_at)
  VALUES (community_sym, 1, NOW(), NOW())
  ON CONFLICT (community_symbol)
  DO UPDATE SET
    post_count = community_stats.post_count + 1,
    last_activity = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get community stats
CREATE OR REPLACE FUNCTION get_community_stats(community_sym TEXT)
RETURNS TABLE (
  community_symbol TEXT,
  member_count BIGINT,
  post_count BIGINT,
  last_activity TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.community_symbol,
    cs.member_count,
    cs.post_count,
    cs.last_activity
  FROM community_stats cs
  WHERE cs.community_symbol = community_sym;
END;
$$ LANGUAGE plpgsql;

-- Function to update or insert community stats atomically
CREATE OR REPLACE FUNCTION upsert_community_stats(
  community_sym TEXT,
  member_count_delta INTEGER DEFAULT 0,
  post_count_delta INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
  INSERT INTO community_stats (community_symbol, member_count, post_count, last_activity, updated_at)
  VALUES (
    community_sym,
    GREATEST(member_count_delta, 0),
    GREATEST(post_count_delta, 0),
    CASE WHEN post_count_delta > 0 THEN NOW() ELSE NULL END,
    NOW()
  )
  ON CONFLICT (community_symbol)
  DO UPDATE SET
    member_count = GREATEST(community_stats.member_count + member_count_delta, 0),
    post_count = GREATEST(community_stats.post_count + post_count_delta, 0),
    last_activity = CASE
      WHEN post_count_delta > 0 THEN NOW()
      ELSE community_stats.last_activity
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_member_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_member_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_post_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_community_stats(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_community_stats(TEXT, INTEGER, INTEGER) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION increment_member_count(TEXT) IS 'Increments member count for a community when someone follows it';
COMMENT ON FUNCTION decrement_member_count(TEXT) IS 'Decrements member count for a community when someone unfollows it';
COMMENT ON FUNCTION increment_post_count(TEXT) IS 'Increments post count for a community when someone creates a post';
COMMENT ON FUNCTION get_community_stats(TEXT) IS 'Gets current stats for a community';
COMMENT ON FUNCTION upsert_community_stats(TEXT, INTEGER, INTEGER) IS 'Atomically updates community stats with deltas';
