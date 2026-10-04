-- Migration 008
-- Purpose: Make posts.email_message_id and comments.email_message_id nullable
-- Created: 2026-10-04
--
-- Run BEFORE deploying the API change that writes NULL instead of '' for
-- web-created posts and comments. That code sends an explicit NULL on insert,
-- which a NOT NULL column rejects, so web posting breaks if the code ships first.
--
-- The currently deployed API and mail server still write '', which stays valid
-- after this migration, so it is safe to run with the old code live.
--
-- This is step 1 of 2. Step 2 (009-email-message-id-unique.sql) converts ''
-- to NULL, removes duplicates and adds the unique keys. It must wait until the
-- new API and mail server are both deployed. See migrations/README.md.
--
-- Only the nullability and the default change. Charset, collation and length
-- stay as in production (varchar(255) ascii ascii_bin). Existing rows keep ''.
--
-- Locking: posts has a FULLTEXT index, so MySQL 8.0 refuses to change the
-- column in place and copies the whole table. Reads keep working; INSERTs and
-- UPDATEs on posts wait until the copy finishes. On a copy of the production
-- data in local Docker that took about 70 seconds. comments changes in place
-- without blocking, in under a second. Run it at a quiet time: inbound mail
-- that waits on the lock can hit the mail server's 30 second plugin timeout.
--
-- Safe to run multiple times.


-- ============================================================================
-- posts.email_message_id: NOT NULL DEFAULT '' -> NULL DEFAULT NULL
-- ============================================================================

SET @is_nullable = (
  SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts'
    AND COLUMN_NAME = 'email_message_id'
);
SET @sql = IF(@is_nullable = 'NO',
  'ALTER TABLE `posts` MODIFY COLUMN `email_message_id` varchar(255) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL',
  'SELECT "posts.email_message_id is already nullable" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- ============================================================================
-- comments.email_message_id: NOT NULL DEFAULT '' -> NULL DEFAULT NULL
-- ============================================================================

SET @is_nullable = (
  SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comments'
    AND COLUMN_NAME = 'email_message_id'
);
SET @sql = IF(@is_nullable = 'NO',
  'ALTER TABLE `comments` MODIFY COLUMN `email_message_id` varchar(255) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL',
  'SELECT "comments.email_message_id is already nullable" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '008 done: email_message_id is nullable on posts and comments' AS status;


-- ============================================================================
-- Rollback (manual, not run by this script)
-- ============================================================================
-- Only valid while 009 has NOT been run, or after rolling 009 back including
-- its optional NULL -> '' step, and only with the old API (which writes '')
-- deployed. The new API inserts NULL, which the NOT NULL column would reject.
--
-- UPDATE `posts` SET `email_message_id` = '', `updated_at` = `updated_at`
--   WHERE `email_message_id` IS NULL;
-- UPDATE `comments` SET `email_message_id` = '' WHERE `email_message_id` IS NULL;
-- ALTER TABLE `posts` MODIFY COLUMN `email_message_id` varchar(255)
--   CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '';
-- ALTER TABLE `comments` MODIFY COLUMN `email_message_id` varchar(255)
--   CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '';
