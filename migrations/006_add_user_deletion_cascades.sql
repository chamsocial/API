-- Migration: Add CASCADE foreign keys for user deletion
-- Created: 2026-01-04
-- Purpose: Enable user deletion by cascading deletes to all related content (except comments)
--
-- When a user is deleted:
-- - CASCADE: posts, media, messages, message_subscribers, groups_users, blog, activations
-- - SET NULL: comments (migration 002) - preserves comments with deleted user shown as [deleted]

SET @ORIG_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

-- Posts: CASCADE delete posts when user is deleted
ALTER TABLE `posts`
ADD CONSTRAINT `fk_posts_user_id`
FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Media: CASCADE delete media when user is deleted (beforeDestroy hook cleans up physical files)
ALTER TABLE `media`
ADD CONSTRAINT `fk_media_user_id`
FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Messages: CASCADE delete messages when user is deleted
ALTER TABLE `messages`
ADD CONSTRAINT `fk_messages_user_id`
FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Message subscribers: CASCADE delete subscriptions when user is deleted
ALTER TABLE `messages_subscribers`
ADD CONSTRAINT `fk_messages_subscribers_user_id`
FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Groups users: CASCADE delete group memberships when user is deleted
ALTER TABLE `groups_users`
ADD CONSTRAINT `fk_groups_users_user_id`
FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Blog: CASCADE delete blog posts when user is deleted
ALTER TABLE `blog`
ADD CONSTRAINT `fk_blog_author_id`
FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Activations: CASCADE delete activation records when user is deleted
ALTER TABLE `activations`
ADD CONSTRAINT `fk_activations_user_id`
FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
ON DELETE CASCADE
ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS = @ORIG_FOREIGN_KEY_CHECKS;

-- Verify the changes
SELECT 'Migration completed: User deletion CASCADE foreign keys added' AS status;
