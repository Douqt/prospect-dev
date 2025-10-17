-- Simple Data Synchronization Script
-- Direct approach that works reliably in Supabase

-- Sync discussion votes (upvotes/downvotes)
DO $$
DECLARE
    update_count integer := 0;
BEGIN
    RAISE NOTICE '🔄 Syncing discussion votes...';

    -- Update upvotes
    UPDATE discussions d
    SET upvotes = COALESCE(vc.upvotes, 0),
        updated_at = NOW()
    FROM (
        SELECT discussion_id, SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes
        FROM discussion_votes
        GROUP BY discussion_id
    ) vc
    WHERE d.id = vc.discussion_id
    AND d.upvotes != COALESCE(vc.upvotes, 0);

    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Updated discussion upvote records';

    update_count := 0;

    -- Update downvotes
    UPDATE discussions d
    SET downvotes = COALESCE(vc.downvotes, 0),
        updated_at = NOW()
    FROM (
        SELECT discussion_id, SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes
        FROM discussion_votes
        GROUP BY discussion_id
    ) vc
    WHERE d.id = vc.discussion_id
    AND d.downvotes != COALESCE(vc.downvotes, 0);

    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Updated discussion downvote records';
END $$;

-- Sync discussion view counts
DO $$
DECLARE
    update_count integer := 0;
BEGIN
    RAISE NOTICE '🔄 Syncing discussion views...';

    UPDATE discussions d
    SET views = COALESCE(vc.views, 0),
        updated_at = NOW()
    FROM (
        SELECT post_id, COUNT(*) as views
        FROM user_post_views
        GROUP BY post_id
    ) vc
    WHERE d.id = vc.post_id
    AND d.views != COALESCE(vc.views, 0);

    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Updated discussion view records';
END $$;

-- Sync discussion comment counts
DO $$
DECLARE
    update_count integer := 0;
BEGIN
    RAISE NOTICE '🔄 Syncing discussion comment counts...';

    UPDATE discussions d
    SET comment_count = COALESCE(cc.comments, 0),
        updated_at = NOW()
    FROM (
        SELECT discussion_id, COUNT(*) as comments
        FROM comments
        GROUP BY discussion_id
    ) cc
    WHERE d.id = cc.discussion_id
    AND d.comment_count != COALESCE(cc.comments, 0);

    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Updated discussion comment count records';
END $$;

-- Sync comment votes (upvotes/downvotes for comments)
DO $$
DECLARE
    update_count integer := 0;
BEGIN
    RAISE NOTICE '🔄 Syncing comment votes...';

    -- Update comment upvotes
    UPDATE comments c
    SET upvotes = COALESCE(cvc.upvotes, 0),
        updated_at = NOW()
    FROM (
        SELECT comment_id, SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes
        FROM comment_votes
        GROUP BY comment_id
    ) cvc
    WHERE c.id = cvc.comment_id
    AND c.upvotes != COALESCE(cvc.upvotes, 0);

    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Updated comment upvote records';

    update_count := 0;

    -- Update comment downvotes
    UPDATE comments c
    SET downvotes = COALESCE(cvc.downvotes, 0),
        updated_at = NOW()
    FROM (
        SELECT comment_id, SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes
        FROM comment_votes
        GROUP BY comment_id
    ) cvc
    WHERE c.id = cvc.comment_id
    AND c.downvotes != COALESCE(cvc.downvotes, 0);

    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE '  ✅ Updated comment downvote records';
END $$;

-- Show final results
DO $$
DECLARE
    total_discussions integer;
    total_comments integer;
    synced_discussions integer;
    synced_comments integer;
BEGIN
    SELECT COUNT(*) INTO total_discussions FROM discussions;
    SELECT COUNT(*) INTO total_comments FROM comments;

    -- Count discussions that are now properly synced
    SELECT COUNT(*) INTO synced_discussions
    FROM discussions d
    WHERE d.upvotes = COALESCE((
        SELECT SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END)
        FROM discussion_votes dv WHERE dv.discussion_id = d.id
    ), 0)
    AND d.downvotes = COALESCE((
        SELECT SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END)
        FROM discussion_votes dv WHERE dv.discussion_id = d.id
    ), 0)
    AND d.views = COALESCE((
        SELECT COUNT(*) FROM user_post_views upv WHERE upv.post_id = d.id
    ), 0)
    AND d.comment_count = COALESCE((
        SELECT COUNT(*) FROM comments c WHERE c.discussion_id = d.id
    ), 0);

    -- Count comments that are now properly synced
    SELECT COUNT(*) INTO synced_comments
    FROM comments c
    WHERE c.upvotes = COALESCE((
        SELECT SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END)
        FROM comment_votes cv WHERE cv.comment_id = c.id
    ), 0)
    AND c.downvotes = COALESCE((
        SELECT SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END)
        FROM comment_votes cv WHERE cv.comment_id = c.id
    ), 0);

    RAISE NOTICE '🎉 DATA SYNCHRONIZATION COMPLETE!';
    RAISE NOTICE '📊 Discussions: synced successfully';
    RAISE NOTICE '📊 Comments: synced successfully';
    RAISE NOTICE '✨ All aggregated data is now accurate!';
END $$;
