-- Migration: Add image_id foreign key to posts
-- Created: 2026-01-03
-- Purpose: Add foreign key constraint for posts.image_id → media.id

-- Check if constraint already exists
SET @constraint_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'posts'
    AND CONSTRAINT_NAME = 'posts_image_id_media_id_fk'
);

-- Add foreign key constraint if it doesn't exist
SET @sql = IF(
  @constraint_exists = 0,
  'ALTER TABLE `posts` ADD CONSTRAINT `posts_image_id_media_id_fk` FOREIGN KEY (`image_id`) REFERENCES `media` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
  'SELECT "Foreign key constraint already exists" AS status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the changes
SELECT 'Migration completed: image_id foreign key constraint checked/added' AS status;
