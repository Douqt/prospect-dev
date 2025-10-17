-- Sync Aggregated Data Script
-- Updates all upvotes, downvotes, views, and comment counts to match actual data
-- Run this script whenever you need to ensure data accuracy

-- Function to sync discussion votes (upvotes/downvotes)
DROP FUNCTION IF EXISTS sync_discussion_votes();

CREATE OR REPLACE FUNCTION sync_discussion_votes()
RETURNS TABLE (
    discussion_id uuid,
    old_upvotes bigint,
    new_upvotes bigint,
    old_downvotes bigint,
    new_downvotes bigint,
    updated boolean
) AS $$
BEGIN
    RETURN QUERY
    WITH vote_counts AS (
        SELECT
            dv.discussion_id,
            COALESCE(SUM(CASE WHEN dv.vote_type = 'up' THEN 1 ELSE 0 END), 0) as actual_upvotes,
            COALESCE(SUM(CASE WHEN dv.vote_type = 'down' THEN 1 ELSE 0 END), 0) as actual_downvotes
        FROM discussion_votes dv
        GROUP BY dv.discussion_id
    ),
    updates AS (
        UPDATE discussions d
        SET
            upvotes = vc.actual_upvotes,
            downvotes = vc.actual_downvotes,
            updated_at = NOW()
        FROM vote_counts vc
        WHERE d.id = vc.discussion_id
        AND (d.upvotes != vc.actual_upvotes OR d.downvotes != vc.actual_downvotes)
        RETURNING
            d.id as discussion_id,
            d.upvotes as old_upvotes,
            vc.actual_upvotes as new_upvotes,
            d.downvotes as old_downvotes,
            vc.actual_downvotes as new_downvotes
    )
    SELECT
        u.discussion_id,
        u.old_upvotes,
        u.new_upvotes,
        u.old_downvotes,
        u.new_downvotes,
        true as updated
    FROM updates u
    UNION ALL
    SELECT
        vc.discussion_id,
        d.upvotes as old_upvotes,
        vc.actual_upvotes as new_upvotes,
        d.downvotes as old_downvotes,
        vc.actual_downvotes as new_downvotes,
        false as updated
    FROM vote_counts vc
    JOIN discussions d ON d.id = vc.discussion_id
    WHERE d.upvotes = vc.actual_upvotes AND d.downvotes = vc.actual_downvotes;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS sync_discussion_views();

-- Function to sync discussion view counts
CREATE OR REPLACE FUNCTION sync_discussion_views()
RETURNS TABLE (
    discussion_id uuid,
    old_views bigint,
    new_views bigint,
    updated boolean
) AS $$
BEGIN
    RETURN QUERY
    WITH view_counts AS (
        SELECT
            upv.post_id as discussion_id,
            COUNT(*) as actual_views
        FROM user_post_views upv
        GROUP BY upv.post_id
    ),
    updates AS (
        UPDATE discussions d
        SET
            views = vc.actual_views,
            updated_at = NOW()
        FROM view_counts vc
        WHERE d.id = vc.discussion_id
        AND d.views != vc.actual_views
        RETURNING
            d.id as discussion_id,
            d.views as old_views,
            vc.actual_views as new_views
    )
    SELECT
        u.discussion_id,
        u.old_views,
        u.new_views,
        true as updated
    FROM updates u
    UNION ALL
    SELECT
        vc.discussion_id,
        d.views as old_views,
        vc.actual_views as new_views,
        false as updated
    FROM view_counts vc
    JOIN discussions d ON d.id = vc.discussion_id
    WHERE d.views = vc.actual_views;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS sync_discussion_comments();

-- Function to sync discussion comment counts
CREATE OR REPLACE FUNCTION sync_discussion_comments()
RETURNS TABLE (
    discussion_id uuid,
    old_comment_count bigint,
    new_comment_count bigint,
    updated boolean
) AS $$
BEGIN
    RETURN QUERY
    WITH comment_counts AS (
        SELECT
            c.discussion_id,
            COUNT(*) as actual_comments
        FROM comments c
        GROUP BY c.discussion_id
    ),
    updates AS (
        UPDATE discussions d
        SET
            comment_count = cc.actual_comments,
            updated_at = NOW()
        FROM comment_counts cc
        WHERE d.id = cc.discussion_id
        AND d.comment_count != cc.actual_comments
        RETURNING
            d.id as discussion_id,
            d.comment_count as old_comment_count,
            cc.actual_comments as new_comment_count
    )
    SELECT
        u.discussion_id,
        u.old_comment_count,
        u.new_comment_count,
        true as updated
    FROM updates u
    UNION ALL
    SELECT
        cc.discussion_id,
        d.comment_count as old_comment_count,
        cc.actual_comments as new_comment_count,
        false as updated
    FROM comment_counts cc
    JOIN discussions d ON d.id = cc.discussion_id
    WHERE d.comment_count = cc.actual_comments;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS sync_comment_votes();

-- Function to sync comment vote counts (upvotes/downvotes for comments)
CREATE OR REPLACE FUNCTION sync_comment_votes()
RETURNS TABLE (
    comment_id uuid,
    old_upvotes bigint,
    new_upvotes bigint,
    old_downvotes bigint,
    new_downvotes bigint,
    updated boolean
) AS $$
BEGIN
    RETURN QUERY
    WITH vote_counts AS (
        SELECT
            cv.comment_id,
            COALESCE(SUM(CASE WHEN cv.vote_type = 'up' THEN 1 ELSE 0 END), 0) as actual_upvotes,
            COALESCE(SUM(CASE WHEN cv.vote_type = 'down' THEN 1 ELSE 0 END), 0) as actual_downvotes
        FROM comment_votes cv
        GROUP BY cv.comment_id
    ),
    updates AS (
        UPDATE comments c
        SET
            upvotes = vc.actual_upvotes,
            downvotes = vc.actual_downvotes,
            updated_at = NOW()
        FROM vote_counts vc
        WHERE c.id = vc.comment_id
        AND (c.upvotes != vc.actual_upvotes OR c.downvotes != vc.actual_downvotes)
        RETURNING
            c.id as comment_id,
            c.upvotes as old_upvotes,
            vc.actual_upvotes as new_upvotes,
            c.downvotes as old_downvotes,
            vc.actual_downvotes as new_downvotes
    )
    SELECT
        u.comment_id,
        u.old_upvotes,
        u.new_upvotes,
        u.old_downvotes,
        u.new_downvotes,
        true as updated
    FROM updates u
    UNION ALL
    SELECT
        vc.comment_id,
        c.upvotes as old_upvotes,
        vc.actual_upvotes as new_upvotes,
        c.downvotes as old_downvotes,
        vc.actual_downvotes as new_downvotes,
        false as updated
    FROM vote_counts vc
    JOIN comments c ON c.id = vc.comment_id
    WHERE c.upvotes = vc.actual_upvotes AND c.downvotes = vc.actual_downvotes;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS sync_all_aggregated_data();

-- Main sync function that runs all updates
CREATE OR REPLACE FUNCTION sync_all_aggregated_data()
RETURNS TABLE (
    operation text,
    records_updated bigint,
    records_unchanged bigint
) AS $$
DECLARE
    vote_result RECORD;
    view_result RECORD;
    comment_result RECORD;
    comment_vote_result RECORD;
    total_updated bigint := 0;
    total_unchanged bigint := 0;
BEGIN
    -- Sync discussion votes
    RAISE NOTICE '🔄 Syncing discussion votes...';
    FOR vote_result IN SELECT * FROM sync_discussion_votes() LOOP
        IF vote_result.updated THEN
            total_updated := total_updated + 1;
        ELSE
            total_unchanged := total_unchanged + 1;
        END IF;
    END LOOP;

    RETURN QUERY SELECT 'discussion_votes'::text, total_updated, total_unchanged;

    total_updated := 0;
    total_unchanged := 0;

    -- Sync discussion views
    RAISE NOTICE '🔄 Syncing discussion views...';
    FOR view_result IN SELECT * FROM sync_discussion_views() LOOP
        IF view_result.updated THEN
            total_updated := total_updated + 1;
        ELSE
            total_unchanged := total_unchanged + 1;
        END IF;
    END LOOP;

    RETURN QUERY SELECT 'discussion_views'::text, total_updated, total_unchanged;

    total_updated := 0;
    total_unchanged := 0;

    -- Sync discussion comment counts
    RAISE NOTICE '🔄 Syncing discussion comment counts...';
    FOR comment_result IN SELECT * FROM sync_discussion_comments() LOOP
        IF comment_result.updated THEN
            total_updated := total_updated + 1;
        ELSE
            total_unchanged := total_unchanged + 1;
        END IF;
    END LOOP;

    RETURN QUERY SELECT 'discussion_comments'::text, total_updated, total_unchanged;

    total_updated := 0;
    total_unchanged := 0;

    -- Sync comment votes
    RAISE NOTICE '🔄 Syncing comment votes...';
    FOR comment_vote_result IN SELECT * FROM sync_comment_votes() LOOP
        IF comment_vote_result.updated THEN
            total_updated := total_updated + 1;
        ELSE
            total_unchanged := total_unchanged + 1;
        END IF;
    END LOOP;

    RETURN QUERY SELECT 'comment_votes'::text, total_updated, total_unchanged;

    RAISE NOTICE '✅ Data synchronization completed!';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for authenticated users to run sync functions
GRANT EXECUTE ON FUNCTION sync_discussion_votes() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_discussion_views() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_discussion_comments() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_comment_votes() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_all_aggregated_data() TO authenticated;

-- Create a convenient view for monitoring data accuracy
CREATE OR REPLACE VIEW data_sync_status AS
WITH discussion_stats AS (
    SELECT
        d.id,
        d.upvotes as stored_upvotes,
        d.downvotes as stored_downvotes,
        d.views as stored_views,
        d.comment_count as stored_comments,
        COALESCE(vc.upvotes, 0) as actual_upvotes,
        COALESCE(vc.downvotes, 0) as actual_downvotes,
        COALESCE(viewc.views, 0) as actual_views,
        COALESCE(cc.comments, 0) as actual_comments,
        CASE
            WHEN d.upvotes != COALESCE(vc.upvotes, 0)
              OR d.downvotes != COALESCE(vc.downvotes, 0)
              OR d.views != COALESCE(viewc.views, 0)
              OR d.comment_count != COALESCE(cc.comments, 0)
            THEN true
            ELSE false
        END as needs_sync
    FROM discussions d
    LEFT JOIN (
        SELECT discussion_id,
               SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes,
               SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes
        FROM discussion_votes
        GROUP BY discussion_id
    ) vc ON vc.discussion_id = d.id
    LEFT JOIN (
        SELECT post_id, COUNT(*) as views
        FROM user_post_views
        GROUP BY post_id
    ) viewc ON viewc.post_id = d.id
    LEFT JOIN (
        SELECT discussion_id, COUNT(*) as comments
        FROM comments
        GROUP BY discussion_id
    ) cc ON cc.discussion_id = d.id
),
comment_stats AS (
    SELECT
        c.id,
        c.upvotes as stored_upvotes,
        c.downvotes as stored_downvotes,
        COALESCE(cvc.upvotes, 0) as actual_upvotes,
        COALESCE(cvc.downvotes, 0) as actual_downvotes,
        CASE
            WHEN c.upvotes != COALESCE(cvc.upvotes, 0)
              OR c.downvotes != COALESCE(cvc.downvotes, 0)
            THEN true
            ELSE false
        END as needs_sync
    FROM comments c
    LEFT JOIN (
        SELECT comment_id,
               SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes,
               SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes
        FROM comment_votes
        GROUP BY comment_id
    ) cvc ON cvc.comment_id = c.id
)
SELECT
    'discussions' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE needs_sync = true) as needs_sync_count,
    COUNT(*) FILTER (WHERE needs_sync = false) as synced_count
FROM discussion_stats
UNION ALL
SELECT
    'comments' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE needs_sync = true) as needs_sync_count,
    COUNT(*) FILTER (WHERE needs_sync = false) as synced_count
FROM comment_stats;

-- Grant select permissions on the status view
GRANT SELECT ON data_sync_status TO authenticated;

-- Output completion message
DO $$
BEGIN
    RAISE NOTICE '🔧 Data synchronization functions created successfully!';
    RAISE NOTICE '📊 Use sync_all_aggregated_data() to sync all data at once';
    RAISE NOTICE '📈 Use data_sync_status view to check data accuracy';
    RAISE NOTICE '🎯 Run individual sync functions as needed';
END $$;
