-- Data validation script for community statistics
-- Run this in your Supabase SQL editor to verify data consistency

-- =============================================================================
-- VALIDATION FUNCTIONS
-- =============================================================================

-- Function to validate and report post count discrepancies
CREATE OR REPLACE FUNCTION validate_post_counts()
RETURNS TABLE (
  community_symbol TEXT,
  cached_post_count INTEGER,
  actual_post_count INTEGER,
  discrepancy INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.community_symbol::TEXT,
    cs.post_count::INTEGER,
    COALESCE(actual_stats.actual_count::INTEGER, 0)::INTEGER,
    (cs.post_count::INTEGER - COALESCE(actual_stats.actual_count::INTEGER, 0)::INTEGER)::INTEGER,
    CASE
      WHEN cs.post_count::INTEGER = COALESCE(actual_stats.actual_count::INTEGER, 0)::INTEGER THEN 'MATCH'
      WHEN cs.post_count::INTEGER > COALESCE(actual_stats.actual_count::INTEGER, 0)::INTEGER THEN 'CACHED_HIGHER'
      WHEN cs.post_count::INTEGER < COALESCE(actual_stats.actual_count::INTEGER, 0)::INTEGER THEN 'CACHED_LOWER'
      ELSE 'UNKNOWN'
    END
  FROM community_stats cs
  LEFT JOIN (
    SELECT
      category::TEXT AS cat_symbol,
      COUNT(*)::INTEGER AS actual_count
    FROM discussions
    WHERE category IS NOT NULL
    GROUP BY category::TEXT
  ) actual_stats
  ON cs.community_symbol = actual_stats.cat_symbol
  ORDER BY
    CASE
      WHEN cs.post_count::INTEGER != COALESCE(actual_stats.actual_count::INTEGER, 0)::INTEGER THEN 0
      ELSE 1
    END,
    cs.community_symbol::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to validate and report member count discrepancies
CREATE OR REPLACE FUNCTION validate_member_counts()
RETURNS TABLE (
  community_symbol TEXT,
  cached_member_count INTEGER,
  actual_member_count INTEGER,
  discrepancy INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.community_symbol::TEXT,
    cs.member_count::INTEGER,
    COALESCE(actual_stats.actual_count::INTEGER, 0)::INTEGER,
    (cs.member_count::INTEGER - COALESCE(actual_stats.actual_count::INTEGER, 0)::INTEGER)::INTEGER,
    CASE
      WHEN cs.member_count::INTEGER = COALESCE(actual_stats.actual_count::INTEGER, 0)::INTEGER THEN 'MATCH'
      WHEN cs.member_count::INTEGER > COALESCE(actual_stats.actual_count::INTEGER, 0)::INTEGER THEN 'CACHED_HIGHER'
      WHEN cs.member_count::INTEGER < COALESCE(actual_stats.actual_count::INTEGER, 0)::INTEGER THEN 'CACHED_LOWER'
      ELSE 'UNKNOWN'
    END
  FROM community_stats cs
  LEFT JOIN (
    SELECT
      community_symbol::TEXT AS comm_sym,
      COUNT(*)::INTEGER AS actual_count
    FROM community_memberships
    GROUP BY community_symbol::TEXT
  ) actual_stats
  ON cs.community_symbol = actual_stats.comm_sym
  ORDER BY
    CASE
      WHEN cs.member_count::INTEGER != COALESCE(actual_stats.actual_count::INTEGER, 0)::INTEGER THEN 0
      ELSE 1
    END,
    cs.community_symbol::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VALIDATION QUERIES
-- =============================================================================

-- 1. VALIDATE POST COUNTS
-- Check for discrepancies between cached post counts and actual discussion counts

SELECT '=== POST COUNT VALIDATION ===' as section;

SELECT
  community_symbol,
  cached_post_count,
  actual_post_count,
  discrepancy,
  status,
  CASE
    WHEN status = 'MATCH' THEN '✅ OK'
    WHEN status = 'CACHED_HIGHER' THEN '⚠️  CACHED TOO HIGH'
    WHEN status = 'CACHED_LOWER' THEN '⚠️  CACHED TOO LOW'
    ELSE '❓ UNKNOWN'
  END as validation_result
FROM validate_post_counts()
ORDER BY
  CASE status
    WHEN 'MATCH' THEN 1
    ELSE 0
  END DESC,
  ABS(discrepancy) DESC;

-- 2. VALIDATE MEMBER COUNTS
-- Check for discrepancies between cached member counts and actual membership counts

SELECT '=== MEMBER COUNT VALIDATION ===' as section;

SELECT
  community_symbol,
  cached_member_count,
  actual_member_count,
  discrepancy,
  status,
  CASE
    WHEN status = 'MATCH' THEN '✅ OK'
    WHEN status = 'CACHED_HIGHER' THEN '⚠️  CACHED TOO HIGH'
    WHEN status = 'CACHED_LOWER' THEN '⚠️  CACHED TOO LOW'
    ELSE '❓ UNKNOWN'
  END as validation_result
FROM validate_member_counts()
ORDER BY
  CASE status
    WHEN 'MATCH' THEN 1
    ELSE 0
  END DESC,
  ABS(discrepancy) DESC;

-- 3. SUMMARY STATISTICS
-- Provide an overview of data consistency

SELECT '=== VALIDATION SUMMARY ===' as section;

WITH post_validation AS (
  SELECT
    COUNT(*) as total_communities,
    COUNT(*) FILTER (WHERE status = 'MATCH') as matching_posts,
    COUNT(*) FILTER (WHERE status != 'MATCH') as mismatched_posts,
    SUM(ABS(discrepancy)) as total_post_discrepancy
  FROM validate_post_counts()
),
member_validation AS (
  SELECT
    COUNT(*) as total_communities,
    COUNT(*) FILTER (WHERE status = 'MATCH') as matching_members,
    COUNT(*) FILTER (WHERE status != 'MATCH') as mismatched_members,
    SUM(ABS(discrepancy)) as total_member_discrepancy
  FROM validate_member_counts()
)
SELECT
  'Post Count Validation' as metric,
  total_communities,
  matching_posts,
  mismatched_posts,
  ROUND((matching_posts::DECIMAL / NULLIF(total_communities, 0)) * 100, 2) as accuracy_percentage,
  total_post_discrepancy as total_discrepancy
FROM post_validation
UNION ALL
SELECT
  'Member Count Validation' as metric,
  total_communities,
  matching_members,
  mismatched_members,
  ROUND((matching_members::DECIMAL / NULLIF(total_communities, 0)) * 100, 2) as accuracy_percentage,
  total_member_discrepancy as total_discrepancy
FROM member_validation;

-- 4. DETAILED DISCREPANCY ANALYSIS
-- Show communities with the largest discrepancies

SELECT '=== TOP DISCREPANCIES ===' as section;

-- Communities with largest post count discrepancies
SELECT
  'POST_COUNT' as type,
  community_symbol,
  cached_post_count,
  actual_post_count,
  discrepancy,
  ABS(discrepancy) as abs_discrepancy
FROM validate_post_counts()
WHERE status != 'MATCH'
ORDER BY abs_discrepancy DESC, community_symbol
LIMIT 10;

-- Communities with largest member count discrepancies
SELECT
  'MEMBER_COUNT' as type,
  community_symbol,
  cached_member_count,
  actual_member_count,
  discrepancy,
  ABS(discrepancy) as abs_discrepancy
FROM validate_member_counts()
WHERE status != 'MATCH'
ORDER BY abs_discrepancy DESC, community_symbol
LIMIT 10;

-- =============================================================================
-- OPTIONAL REPAIR FUNCTIONS
-- =============================================================================

-- Function to fix post count discrepancies (use with caution)
CREATE OR REPLACE FUNCTION repair_post_counts()
RETURNS TABLE (
  community_symbol TEXT,
  old_post_count INTEGER,
  new_post_count INTEGER,
  fixed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH discrepancies AS (
    SELECT
      cs.community_symbol,
      cs.post_count as old_count,
      COALESCE(actual_stats.actual_count, 0)::INTEGER as new_count
    FROM community_stats cs
    LEFT JOIN (
      SELECT
        category AS cat_symbol,
        COUNT(*)::INTEGER as actual_count
      FROM discussions
      WHERE category IS NOT NULL
      GROUP BY category
    ) actual_stats ON cs.community_symbol = actual_stats.cat_symbol
    WHERE cs.post_count != COALESCE(actual_stats.actual_count, 0)::INTEGER
  )
  UPDATE community_stats
  SET
    post_count = discrepancies.new_count,
    updated_at = NOW()
  FROM discrepancies
  WHERE community_stats.community_symbol = discrepancies.community_symbol
  RETURNING
    community_stats.community_symbol,
    discrepancies.old_count,
    community_stats.post_count,
    TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to fix member count discrepancies (use with caution)
CREATE OR REPLACE FUNCTION repair_member_counts()
RETURNS TABLE (
  community_symbol TEXT,
  old_member_count INTEGER,
  new_member_count INTEGER,
  fixed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH discrepancies AS (
    SELECT
      cs.community_symbol,
      cs.member_count as old_count,
      COALESCE(actual_stats.actual_count, 0)::INTEGER as new_count
    FROM community_stats cs
    LEFT JOIN (
      SELECT
        community_symbol AS comm_sym,
        COUNT(*)::INTEGER as actual_count
      FROM community_memberships
      GROUP BY community_symbol
    ) actual_stats ON cs.community_symbol = actual_stats.comm_sym
    WHERE cs.member_count != COALESCE(actual_stats.actual_count, 0)::INTEGER
  )
  UPDATE community_stats
  SET
    member_count = discrepancies.new_count,
    updated_at = NOW()
  FROM discrepancies
  WHERE community_stats.community_symbol = discrepancies.community_symbol
  RETURNING
    community_stats.community_symbol,
    discrepancies.old_count,
    community_stats.member_count,
    TRUE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- USAGE INSTRUCTIONS
-- =============================================================================

/*
To run the validation:

1. Copy and paste this entire script into your Supabase SQL editor
2. Execute the script to see validation results
3. Review the output for any discrepancies

To fix discrepancies (use with caution):

-- Fix post count discrepancies:
SELECT * FROM repair_post_counts();

-- Fix member count discrepancies:
SELECT * FROM repair_member_counts();

Note: Always backup your data before running repair functions!
*/

-- Show current timestamp for reference
SELECT '=== VALIDATION COMPLETED AT ===' as section, NOW() as timestamp;
