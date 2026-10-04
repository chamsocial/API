-- Migration 009
-- Purpose: Unique keys on posts.email_message_id and comments.email_message_id
-- Created: 2026-10-04
--
-- The mail server stores each inbound email's Message-ID here. Two deliveries
-- of the same email can race past its duplicate check and both insert, so the
-- database has to enforce uniqueness. Web-created rows have no Message-ID and
-- store NULL, which a unique key allows any number of times.
--
-- Run AFTER all of these are live:
--   1. 008-email-message-id-nullable.sql (this script aborts if it is missing)
--   2. the API release that writes NULL instead of '' for web posts/comments
--   3. the mail server release that writes NULL instead of ''
-- Code that still writes '' breaks once the unique key exists: the first ''
-- row inserts and every later one fails with a duplicate-key error.
--
-- Steps:
--   A: '' -> NULL on both tables
--   B: keep the lowest id of each duplicated Message-ID, back up the others
--      into `email_message_id_dedupe_backup`, then set their id to NULL
--   C: replace the plain `email_message_id` key with a unique key
--
-- posts.updated_at has ON UPDATE CURRENT_TIMESTAMP. Every UPDATE of posts
-- assigns `updated_at` = `updated_at` so the rows keep their real date.
--
-- On a copy of the production data in local Docker the whole script took about
-- 13 seconds, 10 of them in the posts '' -> NULL UPDATE. Both key changes run
-- in place without a table copy.
--
-- Safe to run multiple times. A rerun finds nothing to convert or dedupe and
-- skips the key change. If a new duplicate arrives between B and C, C fails
-- with ERROR 1062; run the script again.
--
-- Keep `email_message_id_dedupe_backup` until the result is verified. The
-- rollback below reads from it.


-- ============================================================================
-- Guard: 008 must have run
-- ============================================================================
-- Without it the UPDATEs below either fail (strict sql_mode) or silently store
-- '' instead of NULL. SIGNAL can't be prepared, so a failing SELECT stops the
-- mysql client instead, with the reason in the error text.

SET @posts_nullable = (
  SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts'
    AND COLUMN_NAME = 'email_message_id'
);
SET @comments_nullable = (
  SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comments'
    AND COLUMN_NAME = 'email_message_id'
);
SET @sql = IF(@posts_nullable = 'YES' AND @comments_nullable = 'YES',
  'SELECT "email_message_id is nullable on posts and comments" AS status',
  'SELECT 1 FROM `ABORTED - run 008-email-message-id-nullable.sql first`'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- ============================================================================
-- A: '' -> NULL
-- ============================================================================

UPDATE `posts`
SET `email_message_id` = NULL, `updated_at` = `updated_at`
WHERE `email_message_id` = '';

UPDATE `comments`
SET `email_message_id` = NULL
WHERE `email_message_id` = '';

SELECT 'A done: empty email_message_id converted to NULL' AS status;


-- ============================================================================
-- B: Remove duplicate Message-IDs, keeping the lowest id
-- ============================================================================
-- The backup holds one row per cleared post/comment: its original Message-ID
-- and the id that kept it. The UPDATEs join the backup table instead of a
-- subquery on the table being updated, which MySQL rejects (ERROR 1093).

CREATE TABLE IF NOT EXISTS `email_message_id_dedupe_backup` (
  `tbl` enum('posts','comments') NOT NULL,
  `id` int unsigned NOT NULL,
  `email_message_id` varchar(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `kept_id` int unsigned NOT NULL,
  PRIMARY KEY (`tbl`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `email_message_id_dedupe_backup` (`tbl`, `id`, `email_message_id`, `kept_id`)
SELECT 'posts', p.`id`, p.`email_message_id`, d.`kept_id`
FROM `posts` p
JOIN (
  SELECT `email_message_id`, MIN(`id`) AS `kept_id`
  FROM `posts`
  WHERE `email_message_id` IS NOT NULL AND `email_message_id` <> ''
  GROUP BY `email_message_id`
  HAVING COUNT(*) > 1
) d ON d.`email_message_id` = p.`email_message_id`
WHERE p.`id` <> d.`kept_id`;

INSERT IGNORE INTO `email_message_id_dedupe_backup` (`tbl`, `id`, `email_message_id`, `kept_id`)
SELECT 'comments', c.`id`, c.`email_message_id`, d.`kept_id`
FROM `comments` c
JOIN (
  SELECT `email_message_id`, MIN(`id`) AS `kept_id`
  FROM `comments`
  WHERE `email_message_id` IS NOT NULL AND `email_message_id` <> ''
  GROUP BY `email_message_id`
  HAVING COUNT(*) > 1
) d ON d.`email_message_id` = c.`email_message_id`
WHERE c.`id` <> d.`kept_id`;

UPDATE `posts` p
JOIN `email_message_id_dedupe_backup` b
  ON b.`tbl` = 'posts' AND b.`id` = p.`id`
  AND b.`email_message_id` = p.`email_message_id`
SET p.`email_message_id` = NULL, p.`updated_at` = p.`updated_at`;

UPDATE `comments` c
JOIN `email_message_id_dedupe_backup` b
  ON b.`tbl` = 'comments' AND b.`id` = c.`id`
  AND b.`email_message_id` = c.`email_message_id`
SET c.`email_message_id` = NULL;

SELECT 'B done: duplicate email_message_id cleared, originals in email_message_id_dedupe_backup' AS status;


-- ============================================================================
-- C: Replace the plain key with a unique key
-- ============================================================================
-- The mail server matches on the key names uq_posts_email_message_id and
-- uq_comments_email_message_id. Don't rename them.

SET @has_plain = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts'
    AND INDEX_NAME = 'email_message_id'
);
SET @has_unique = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts'
    AND INDEX_NAME = 'uq_posts_email_message_id'
);
SET @sql = IF(@has_plain = 0 AND @has_unique > 0,
  'SELECT "uq_posts_email_message_id already exists" AS status',
  CONCAT('ALTER TABLE `posts` ', CONCAT_WS(', ',
    IF(@has_plain > 0, 'DROP KEY `email_message_id`', NULL),
    IF(@has_unique = 0, 'ADD UNIQUE KEY `uq_posts_email_message_id` (`email_message_id`)', NULL)
  ))
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_plain = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comments'
    AND INDEX_NAME = 'email_message_id'
);
SET @has_unique = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comments'
    AND INDEX_NAME = 'uq_comments_email_message_id'
);
SET @sql = IF(@has_plain = 0 AND @has_unique > 0,
  'SELECT "uq_comments_email_message_id already exists" AS status',
  CONCAT('ALTER TABLE `comments` ', CONCAT_WS(', ',
    IF(@has_plain > 0, 'DROP KEY `email_message_id`', NULL),
    IF(@has_unique = 0, 'ADD UNIQUE KEY `uq_comments_email_message_id` (`email_message_id`)', NULL)
  ))
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'C done: unique keys on posts and comments email_message_id' AS status;

SELECT '009 done' AS status;


-- ============================================================================
-- Rollback (manual, not run by this script)
-- ============================================================================
-- Run in this order. Step 2 must come after step 1, since the restored
-- duplicates violate the unique key.
--
-- 1. Unique keys back to plain keys
-- ALTER TABLE `posts` DROP KEY `uq_posts_email_message_id`,
--   ADD KEY `email_message_id` (`email_message_id`);
-- ALTER TABLE `comments` DROP KEY `uq_comments_email_message_id`,
--   ADD KEY `email_message_id` (`email_message_id`);
--
-- 2. Restore the Message-IDs cleared by step B
-- UPDATE `posts` p
-- JOIN `email_message_id_dedupe_backup` b ON b.`tbl` = 'posts' AND b.`id` = p.`id`
-- SET p.`email_message_id` = b.`email_message_id`, p.`updated_at` = p.`updated_at`
-- WHERE p.`email_message_id` IS NULL;
-- UPDATE `comments` c
-- JOIN `email_message_id_dedupe_backup` b ON b.`tbl` = 'comments' AND b.`id` = c.`id`
-- SET c.`email_message_id` = b.`email_message_id`
-- WHERE c.`email_message_id` IS NULL;
--
-- 3. Optional: NULL back to ''. Only needed to also roll back 008 (see the
--    rollback in that file). This also turns NULLs written by the new code
--    into '', which matches what the old code wrote.
-- UPDATE `posts` SET `email_message_id` = '', `updated_at` = `updated_at`
--   WHERE `email_message_id` IS NULL;
-- UPDATE `comments` SET `email_message_id` = '' WHERE `email_message_id` IS NULL;
--
-- 4. Once nothing else needs it
-- DROP TABLE `email_message_id_dedupe_backup`;
