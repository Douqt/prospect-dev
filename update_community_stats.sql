-- Update community_stats table with correct member and post counts
-- This SQL will update existing records or insert new ones as needed

-- First, delete existing records to avoid conflicts
DELETE FROM community_stats;

-- Insert fresh data for all forums
INSERT INTO community_stats (community_symbol, member_count, post_count, last_activity, created_at, updated_at)
SELECT
    UPPER(d.category) as community_symbol,
    COALESCE(cm.member_count, 0) as member_count,
    COUNT(d.id) as post_count,
    NOW() as last_activity,
    NOW() as created_at,
    NOW() as updated_at
FROM discussions d
LEFT JOIN (
    SELECT
        community_symbol,
        COUNT(*) as member_count
    FROM community_memberships
    GROUP BY community_symbol
) cm ON cm.community_symbol = UPPER(d.category)
GROUP BY d.category, cm.member_count;
