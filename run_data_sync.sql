-- Data Synchronization Runner
-- Run this file in Supabase SQL Editor to sync all aggregated data

-- Enable timing for performance monitoring
\timing on

-- Show current data status before sync
DO $$
BEGIN
    RAISE NOTICE '📊 CURRENT DATA STATUS:';
END $$;

SELECT
    table_name,
    total_records,
    needs_sync_count,
    synced_count,
    ROUND((synced_count::numeric / NULLIF(total_records, 0)) * 100, 2) as sync_percentage
FROM data_sync_status
ORDER BY table_name;

-- Run the complete data synchronization
DO $$
DECLARE
    sync_result RECORD;
    total_updated bigint := 0;
    total_unchanged bigint := 0;
BEGIN
    RAISE NOTICE '🚀 STARTING DATA SYNCHRONIZATION...';
    RAISE NOTICE '=====================================';

    -- Run the main sync function
    FOR sync_result IN SELECT * FROM sync_all_aggregated_data() LOOP
        RAISE NOTICE '✅ %: % updated, % unchanged',
            sync_result.operation,
            sync_result.records_updated,
            sync_result.records_unchanged;

        total_updated := total_updated + sync_result.records_updated;
        total_unchanged := total_unchanged + sync_result.records_unchanged;
    END LOOP;

    RAISE NOTICE '=====================================';
    RAISE NOTICE '🎉 SYNCHRONIZATION COMPLETE!';
    RAISE NOTICE '📈 Total records updated: %', total_updated;
    RAISE NOTICE '📊 Total records unchanged: %', total_unchanged;
    RAISE NOTICE '⏱️  All aggregated data is now accurate!';
END $$;

-- Show final data status
DO $$
BEGIN
    RAISE NOTICE '📊 FINAL DATA STATUS:';
END $$;

SELECT
    table_name,
    total_records,
    needs_sync_count,
    synced_count,
    ROUND((synced_count::numeric / NULLIF(total_records, 0)) * 100, 2) as sync_percentage
FROM data_sync_status
ORDER BY table_name;

-- Show detailed changes for verification (optional - comment out if too much data)
-- DO $$
-- BEGIN
--     RAISE NOTICE '🔍 DETAILED CHANGES (Sample):';
-- END $$;

-- SELECT * FROM sync_discussion_votes() LIMIT 5;
-- SELECT * FROM sync_discussion_views() LIMIT 5;
-- SELECT * FROM sync_discussion_comments() LIMIT 5;
-- SELECT * FROM sync_comment_votes() LIMIT 5;

-- Final summary
DO $$
BEGIN
    RAISE NOTICE '✨ DATA SYNCHRONIZATION SUMMARY';
    RAISE NOTICE '==============================';
    RAISE NOTICE '🎯 All upvotes, downvotes, views, and comment counts are now accurate';
    RAISE NOTICE '🔄 Run this script anytime you need to sync aggregated data';
    RAISE NOTICE '📊 Use SELECT * FROM data_sync_status; to check sync status';
    RAISE NOTICE '⚡ Your social media platform data is now consistent!';
END $$;
