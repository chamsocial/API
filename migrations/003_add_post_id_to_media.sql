-- Migration: Add post_id to media table
-- Created: 2026-01-03
-- Purpose: Add direct relationship between media and posts (replaces media_relations)

-- Add post_id column
ALTER TABLE `media`
ADD COLUMN `post_id` int unsigned NULL AFTER `user_id`;

-- Add foreign key constraint
ALTER TABLE `media`
ADD CONSTRAINT `media_post_id_posts_id_fk`
FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Create performance index
CREATE INDEX `idx_media_postId` ON `media` (`post_id`);

-- Verify the changes
SELECT 'Migration completed: post_id added to media table with foreign key and index' AS status;
