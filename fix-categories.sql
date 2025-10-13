-- Fix category constraint for stock forums
-- Run this in your Supabase SQL editor

-- Remove the restrictive constraint that only allows specific categories
ALTER TABLE discussions DROP CONSTRAINT discussions_category_check;

-- Add a more permissive constraint that allows any category string (1-50 chars)
ALTER TABLE discussions
ADD CONSTRAINT discussions_category_check
CHECK (char_length(category) >= 1 AND char_length(category) <= 50);

-- Verify what categories exist in your database
SELECT DISTINCT category, COUNT(*) as post_count
FROM discussions
GROUP BY category
ORDER BY post_count DESC;
