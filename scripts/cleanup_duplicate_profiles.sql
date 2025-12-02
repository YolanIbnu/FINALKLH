-- Optional cleanup script to remove duplicate profiles
-- This script removes duplicate profiles keeping only the oldest one for each user_id

-- First, let's see what duplicates exist
SELECT user_id, COUNT(*) as duplicate_count 
FROM profiles 
WHERE user_id IS NOT NULL 
GROUP BY user_id 
HAVING COUNT(*) > 1;

-- Remove duplicates, keeping the oldest record for each user_id
DELETE FROM profiles p1
USING profiles p2
WHERE p1.user_id = p2.user_id 
  AND p1.user_id IS NOT NULL
  AND p1.created_at > p2.created_at;

-- Alternative method using ctid (row identifier) if created_at is not reliable
-- DELETE FROM profiles p1
-- USING profiles p2
-- WHERE p1.user_id = p2.user_id 
--   AND p1.user_id IS NOT NULL
--   AND p1.ctid > p2.ctid;

-- Verify cleanup results
SELECT user_id, COUNT(*) as remaining_count 
FROM profiles 
WHERE user_id IS NOT NULL 
GROUP BY user_id 
HAVING COUNT(*) > 1;
