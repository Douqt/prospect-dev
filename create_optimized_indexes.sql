-- Create optimized indexes for Supabase queries
-- These indexes are designed to support the cursor-based pagination and indexed filters
-- implemented in the application code

-- Index for discussions table (equivalent to posts) - supports idx_posts_author_created
-- This index optimizes queries filtering by user_id (author_id) and ordering by created_at
CREATE INDEX IF NOT EXISTS idx_discussions_user_created ON discussions (user_id, created_at DESC);

-- Index for discussions by category - supports filtering by category/forum
CREATE INDEX IF NOT EXISTS idx_discussions_category ON discussions (category);

-- Index for discussions by category and created_at - for forum-specific pagination
CREATE INDEX IF NOT EXISTS idx_discussions_category_created ON discussions (category, created_at DESC);

-- Composite index for discussions - supports complex queries with multiple filters
CREATE INDEX IF NOT EXISTS idx_discussions_user_category_created ON discussions (user_id, category, created_at DESC);

-- Indexes for comments table - supports idx_comments_post_parent and idx_comments_parent_id
-- Primary composite index for comments filtering by discussion_id, parent_id, and created_at
CREATE INDEX IF NOT EXISTS idx_comments_discussion_parent_created ON comments (discussion_id, parent_id, created_at);

-- Index for comments by discussion_id only (post_id equivalent)
CREATE INDEX IF NOT EXISTS idx_comments_discussion_id ON comments (discussion_id);

-- Index for comments by parent_id only
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments (parent_id);

-- Index for comments by user_id (author_id equivalent)
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments (user_id);

-- Composite index for comments by user_id and created_at
CREATE INDEX IF NOT EXISTS idx_comments_user_created ON comments (user_id, created_at DESC);

-- Index for comments by discussion_id and created_at (for pagination within a discussion)
CREATE INDEX IF NOT EXISTS idx_comments_discussion_created ON comments (discussion_id, created_at);

-- Indexes for profiles table
-- Index for profile lookups by user_id
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles (id);

-- Index for profile lookups by username
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles (username);

-- Indexes for community_memberships table
-- Index for membership lookups by user_id
CREATE INDEX IF NOT EXISTS idx_community_memberships_user_id ON community_memberships (user_id);

-- Index for membership lookups by community_symbol
CREATE INDEX IF NOT EXISTS idx_community_memberships_symbol ON community_memberships (community_symbol);

-- Composite index for membership lookups by user_id and community_symbol
CREATE INDEX IF NOT EXISTS idx_community_memberships_user_symbol ON community_memberships (user_id, community_symbol);

-- Indexes for discussion_votes table
-- Index for vote lookups by discussion_id
CREATE INDEX IF NOT EXISTS idx_discussion_votes_discussion_id ON discussion_votes (discussion_id);

-- Index for vote lookups by user_id
CREATE INDEX IF NOT EXISTS idx_discussion_votes_user_id ON discussion_votes (user_id);

-- Composite index for vote lookups by discussion_id and user_id
CREATE INDEX IF NOT EXISTS idx_discussion_votes_discussion_user ON discussion_votes (discussion_id, user_id);

-- Index for vote_type filtering
CREATE INDEX IF NOT EXISTS idx_discussion_votes_type ON discussion_votes (vote_type);

-- Indexes for comment_votes table
-- Index for comment vote lookups by comment_id
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment_id ON comment_votes (comment_id);

-- Index for comment vote lookups by user_id
CREATE INDEX IF NOT EXISTS idx_comment_votes_user_id ON comment_votes (user_id);

-- Composite index for comment vote lookups by comment_id and user_id
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment_user ON comment_votes (comment_id, user_id);

-- Index for comment vote_type filtering
CREATE INDEX IF NOT EXISTS idx_comment_votes_type ON comment_votes (vote_type);

-- Indexes for user_post_views table (for view tracking)
-- Index for view lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_post_views_user_id ON user_post_views (user_id);

-- Index for view lookups by post_id
CREATE INDEX IF NOT EXISTS idx_user_post_views_post_id ON user_post_views (post_id);

-- Composite index for view lookups by user_id and post_id
CREATE INDEX IF NOT EXISTS idx_user_post_views_user_post ON user_post_views (user_id, post_id);

-- Index for view timestamp queries
CREATE INDEX IF NOT EXISTS idx_user_post_views_viewed_at ON user_post_views (viewed_at DESC);

-- Create tsvector column for full-text search on discussions
-- This supports the textSearch() functionality added to the pagination helper
ALTER TABLE discussions ADD COLUMN IF NOT EXISTS searchable tsvector;

-- Create index for full-text search
CREATE INDEX IF NOT EXISTS idx_discussions_searchable ON discussions USING gin (searchable);

-- Create tsvector column for full-text search on comments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS searchable tsvector;

-- Create index for full-text search on comments
CREATE INDEX IF NOT EXISTS idx_comments_searchable ON comments USING gin (searchable);

-- Function to update tsvector columns when content changes
CREATE OR REPLACE FUNCTION update_discussions_searchable()
RETURNS TRIGGER AS $$
BEGIN
    NEW.searchable := to_tsvector('english',
        COALESCE(NEW.title, '') || ' ' ||
        COALESCE(NEW.content, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_comments_searchable()
RETURNS TRIGGER AS $$
BEGIN
    NEW.searchable := to_tsvector('english',
        COALESCE(NEW.content, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update searchable columns
DROP TRIGGER IF EXISTS trigger_update_discussions_searchable ON discussions;
CREATE TRIGGER trigger_update_discussions_searchable
    BEFORE INSERT OR UPDATE ON discussions
    FOR EACH ROW
    EXECUTE FUNCTION update_discussions_searchable();

DROP TRIGGER IF EXISTS trigger_update_comments_searchable ON comments;
CREATE TRIGGER trigger_update_comments_searchable
    BEFORE INSERT OR UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comments_searchable();

-- Update existing records to populate searchable columns
UPDATE discussions SET title = title WHERE searchable IS NULL;
UPDATE comments SET content = content WHERE searchable IS NULL;

-- Create view count increment function for atomic updates
CREATE OR REPLACE FUNCTION increment_view_count(post_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE discussions
    SET views = views + 1
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION increment_view_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_discussions_searchable() TO authenticated;
GRANT EXECUTE ON FUNCTION update_comments_searchable() TO authenticated;

-- Analyze tables to update query planner statistics
ANALYZE discussions;
ANALYZE comments;
ANALYZE profiles;
ANALYZE community_memberships;
ANALYZE discussion_votes;
ANALYZE comment_votes;
ANALYZE user_post_views;

-- Output completion message
DO $$
BEGIN
    RAISE NOTICE 'Optimized indexes created successfully!';
    RAISE NOTICE 'All queries will now use indexes for optimal performance.';
    RAISE NOTICE 'Full-text search is now available on discussions and comments.';
END $$;
