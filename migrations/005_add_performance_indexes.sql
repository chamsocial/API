-- Migration: Add performance indexes
-- Created: 2026-01-03
-- Purpose: Optimize database queries with composite and single-column indexes

-- Posts table indexes
CREATE INDEX IF NOT EXISTS `idx_posts_status_groupId` ON `posts` (`status`, `group_id`);
CREATE INDEX IF NOT EXISTS `idx_posts_status_userId` ON `posts` (`status`, `user_id`);
CREATE INDEX IF NOT EXISTS `idx_posts_status_createdAt` ON `posts` (`status`, `created_at`);

-- Comments table indexes
CREATE INDEX IF NOT EXISTS `idx_comments_postId_createdAt` ON `comments` (`post_id`, `created_at`);
CREATE INDEX IF NOT EXISTS `idx_comments_createdAt` ON `comments` (`created_at`);

-- Messages table index
CREATE INDEX IF NOT EXISTS `idx_messages_threadId_userId` ON `messages` (`thread_id`, `user_id`);

-- Blog table index
CREATE INDEX IF NOT EXISTS `idx_blog_status_authorId` ON `blog` (`status`, `author_id`);

-- GroupsUsers table index
CREATE INDEX IF NOT EXISTS `idx_groups_users_userId_type` ON `groups_users` (`user_id`, `type`);

-- Verify the changes
SELECT 'Migration completed: Performance indexes added' AS status;
