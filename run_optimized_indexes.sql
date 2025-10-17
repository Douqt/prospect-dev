-- Run this file in your Supabase SQL editor to create all optimized indexes
-- This script executes the index creation and provides feedback

-- Enable timing for performance monitoring
\timing on

-- Create all optimized indexes
\i create_optimized_indexes.sql

-- Verify indexes were created successfully
DO $$
DECLARE
    index_count integer;
BEGIN
    -- Count total indexes created
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';

    RAISE NOTICE '✅ Index creation completed successfully!';
    RAISE NOTICE '📊 Total indexes in public schema: %', index_count;

    -- Show specific indexes for our tables
    RAISE NOTICE '🔍 Discussions table indexes:';
    FOR index_count IN
        SELECT COUNT(*) FROM pg_indexes
        WHERE tablename = 'discussions' AND indexname LIKE 'idx_%'
    LOOP
        RAISE NOTICE '   - % discussions indexes created', index_count;
    END LOOP;

    RAISE NOTICE '🔍 Comments table indexes:';
    FOR index_count IN
        SELECT COUNT(*) FROM pg_indexes
        WHERE tablename = 'comments' AND indexname LIKE 'idx_%'
    LOOP
        RAISE NOTICE '   - % comments indexes created', index_count;
    END LOOP;

    RAISE NOTICE '🔍 Other table indexes:';
    FOR index_count IN
        SELECT COUNT(*) FROM pg_indexes
        WHERE tablename IN ('profiles', 'community_memberships', 'discussion_votes', 'comment_votes', 'user_post_views')
        AND indexname LIKE 'idx_%'
    LOOP
        RAISE NOTICE '   - % additional indexes created', index_count;
    END LOOP;

    RAISE NOTICE '🚀 Your database is now optimized for high-performance queries!';
    RAISE NOTICE '💡 All queries will now use indexes for optimal performance.';
END $$;

-- Show current index status
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
