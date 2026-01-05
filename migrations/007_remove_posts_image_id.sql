-- Migration: Remove image_id from posts
-- Created: 2026-01-04
-- Purpose: Remove unused image_id column from posts table
--
-- The image_id field was added in migration 004 but is not used anywhere in the codebase.
-- Posts can have multiple media attachments via media.post_id, making a single image_id unnecessary.

SET @ORIG_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

-- Check if foreign key constraint exists before dropping
SET @constraint_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'posts'
    AND CONSTRAINT_NAME = 'posts_image_id_media_id_fk'
);

-- Drop foreign key constraint if it exists
SET @drop_fk_sql = IF(
  @constraint_exists > 0,
  'ALTER TABLE `posts` DROP FOREIGN KEY `posts_image_id_media_id_fk`',
  'SELECT "Foreign key constraint does not exist, skipping" AS status'
);

PREPARE stmt FROM @drop_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if column exists before dropping
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'posts'
    AND COLUMN_NAME = 'image_id'
);

-- Drop column if it exists
SET @drop_col_sql = IF(
  @column_exists > 0,
  'ALTER TABLE `posts` DROP COLUMN `image_id`',
  'SELECT "Column does not exist, skipping" AS status'
);

PREPARE stmt FROM @drop_col_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = @ORIG_FOREIGN_KEY_CHECKS;

-- Verify the changes
SELECT 'Migration completed: image_id column removed from posts' AS status;
