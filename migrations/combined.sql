-- Combined Migration
-- Purpose: All database changes for user deletion, rate limiting, and performance
-- Created: 2026-02-06
--
-- Combines migrations 001-007 into a single idempotent script safe to run
-- against the production schema as of 2026-02-06.
--
-- Changes:
--   001: Add rate limiting columns to users
--   002: Change comments.user_id FK from CASCADE to SET NULL
--   003: Add FK + index on media.post_id (column already exists)
--   004: SKIPPED — posts.image_id FK removed in 007 anyway
--   005: Add 8 performance indexes
--   006: Add CASCADE FK on posts.user_id + blog.author_id (other tables already correct)
--   007: Remove posts.image_id column

SET @ORIG_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;


-- ============================================================================
-- 001: Add rate limiting fields to users table
-- ============================================================================

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'failed_login_attempts'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `failed_login_attempts` int unsigned NOT NULL DEFAULT 0 AFTER `last_login`',
  'SELECT "users.failed_login_attempts already exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'last_failed_login'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `last_failed_login` timestamp NULL AFTER `failed_login_attempts`',
  'SELECT "users.last_failed_login already exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'locked_until'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `locked_until` timestamp NULL AFTER `last_failed_login`',
  'SELECT "users.locked_until already exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '001 done: Rate limiting fields added to users' AS status;


-- ============================================================================
-- 002: Update comments FK — CASCADE → SET NULL
-- ============================================================================

-- Find actual FK name on comments.user_id → users.id
SET @fk_name = (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'comments'
    AND COLUMN_NAME = 'user_id'
    AND REFERENCED_TABLE_NAME = 'users'
    AND REFERENCED_COLUMN_NAME = 'id'
  LIMIT 1
);

-- Drop it
SET @sql = IF(@fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `comments` DROP FOREIGN KEY `', @fk_name, '`'),
  'SELECT "No existing FK on comments.user_id" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Make user_id nullable
ALTER TABLE `comments` MODIFY COLUMN `user_id` int unsigned NULL;

-- Re-add with SET NULL
SET @fk_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'comments'
    AND COLUMN_NAME = 'user_id'
    AND REFERENCED_TABLE_NAME = 'users'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `comments` ADD CONSTRAINT `comments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT "FK on comments.user_id already exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '002 done: comments.user_id now nullable with SET NULL FK' AS status;


-- ============================================================================
-- 003: Add FK + index on media.post_id (column already exists in prod)
-- ============================================================================

-- Add column only if missing (it exists in prod, but be safe)
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media'
    AND COLUMN_NAME = 'post_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `media` ADD COLUMN `post_id` int unsigned NULL AFTER `user_id`',
  'SELECT "media.post_id already exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add FK if missing
SET @fk_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'media'
    AND COLUMN_NAME = 'post_id'
    AND REFERENCED_TABLE_NAME = 'posts'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `media` ADD CONSTRAINT `media_post_id_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT "FK on media.post_id already exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index if missing
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media'
    AND INDEX_NAME = 'idx_media_postId'
);
SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX `idx_media_postId` ON `media` (`post_id`)',
  'SELECT "Index idx_media_postId already exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '003 done: media.post_id FK + index added' AS status;


-- ============================================================================
-- 003b: Backfill media.post_id from media_relations (if table exists)
-- ============================================================================

SET @tbl_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media_relations'
);
-- NOTE: mr.id is the entity/post ID (composite PK column), not an auto-increment PK.
-- The old media_relations model used (id, media_id, type) where id = the related entity's PK.
SET @sql = IF(@tbl_exists > 0,
  'UPDATE `media` m JOIN `media_relations` mr ON mr.media_id = m.id AND mr.type = ''post'' SET m.post_id = mr.id WHERE m.post_id IS NULL',
  'SELECT "media_relations table does not exist, skipping backfill" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '003b done: media.post_id backfilled from media_relations' AS status;


-- ============================================================================
-- 004: SKIPPED — image_id FK would be immediately removed by 007
-- ============================================================================

SELECT '004 skipped: posts.image_id FK not needed (removed in 007)' AS status;


-- ============================================================================
-- 005: Add performance indexes
-- ============================================================================

-- idx_posts_status_groupId
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts'
    AND INDEX_NAME = 'idx_posts_status_groupId'
);
SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX `idx_posts_status_groupId` ON `posts` (`status`, `group_id`)',
  'SELECT "idx_posts_status_groupId exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- idx_posts_status_userId
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts'
    AND INDEX_NAME = 'idx_posts_status_userId'
);
SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX `idx_posts_status_userId` ON `posts` (`status`, `user_id`)',
  'SELECT "idx_posts_status_userId exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- idx_posts_status_createdAt
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts'
    AND INDEX_NAME = 'idx_posts_status_createdAt'
);
SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX `idx_posts_status_createdAt` ON `posts` (`status`, `created_at`)',
  'SELECT "idx_posts_status_createdAt exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- idx_comments_postId_createdAt
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comments'
    AND INDEX_NAME = 'idx_comments_postId_createdAt'
);
SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX `idx_comments_postId_createdAt` ON `comments` (`post_id`, `created_at`)',
  'SELECT "idx_comments_postId_createdAt exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- idx_comments_createdAt
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comments'
    AND INDEX_NAME = 'idx_comments_createdAt'
);
SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX `idx_comments_createdAt` ON `comments` (`created_at`)',
  'SELECT "idx_comments_createdAt exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- idx_messages_threadId_userId
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages'
    AND INDEX_NAME = 'idx_messages_threadId_userId'
);
SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX `idx_messages_threadId_userId` ON `messages` (`thread_id`, `user_id`)',
  'SELECT "idx_messages_threadId_userId exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- idx_blog_status_authorId
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blog'
    AND INDEX_NAME = 'idx_blog_status_authorId'
);
SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX `idx_blog_status_authorId` ON `blog` (`status`, `author_id`)',
  'SELECT "idx_blog_status_authorId exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- idx_groups_users_userId_type
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'groups_users'
    AND INDEX_NAME = 'idx_groups_users_userId_type'
);
SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX `idx_groups_users_userId_type` ON `groups_users` (`user_id`, `type`)',
  'SELECT "idx_groups_users_userId_type exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '005 done: 8 performance indexes added' AS status;


-- ============================================================================
-- 006: CASCADE FKs for user deletion (posts + blog only)
-- ============================================================================
-- media, messages, messages_subscribers, groups_users, activations already
-- have ON DELETE CASCADE in production — no changes needed.

-- posts.user_id — no FK exists in production
SET @fk_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'posts'
    AND COLUMN_NAME = 'user_id'
    AND REFERENCED_TABLE_NAME = 'users'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `posts` ADD CONSTRAINT `fk_posts_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT "FK on posts.user_id already exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- blog.author_id — FK exists but without CASCADE, need to replace
-- Find existing FK name
SET @fk_name = (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'blog'
    AND COLUMN_NAME = 'author_id'
    AND REFERENCED_TABLE_NAME = 'users'
    AND REFERENCED_COLUMN_NAME = 'id'
  LIMIT 1
);

-- Drop old FK
SET @sql = IF(@fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `blog` DROP FOREIGN KEY `', @fk_name, '`'),
  'SELECT "No existing FK on blog.author_id" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add new FK with CASCADE
SET @fk_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'blog'
    AND COLUMN_NAME = 'author_id'
    AND REFERENCED_TABLE_NAME = 'users'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `blog` ADD CONSTRAINT `fk_blog_author_id` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT "FK on blog.author_id already exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '006 done: CASCADE FKs added for posts.user_id and blog.author_id' AS status;


-- ============================================================================
-- 007: Remove image_id from posts
-- ============================================================================

-- Drop any FK on posts.image_id (none in prod, but be safe)
SET @fk_name = (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'posts'
    AND COLUMN_NAME = 'image_id'
    AND REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);
SET @sql = IF(@fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `posts` DROP FOREIGN KEY `', @fk_name, '`'),
  'SELECT "No FK on posts.image_id" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop column (index is dropped automatically with it)
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts'
    AND COLUMN_NAME = 'image_id'
);
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE `posts` DROP COLUMN `image_id`',
  'SELECT "posts.image_id does not exist" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '007 done: posts.image_id removed' AS status;


-- ============================================================================
SET FOREIGN_KEY_CHECKS = @ORIG_FOREIGN_KEY_CHECKS;

SELECT 'All migrations completed successfully' AS status;
