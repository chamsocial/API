-- Migration: Update comments foreign key behavior
-- Created: 2026-01-03
-- Purpose: Change user_id foreign key to SET NULL on delete (preserve comments when user is deleted)

-- Drop existing foreign key
ALTER TABLE `comments` DROP FOREIGN KEY `comments_user_id_users_id_fk`;

-- Make user_id nullable
ALTER TABLE `comments` MODIFY COLUMN `user_id` int unsigned NULL;

-- Re-add foreign key with SET NULL on delete
ALTER TABLE `comments`
ADD CONSTRAINT `comments_user_id_users_id_fk`
FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Verify the changes
SELECT 'Migration completed: Comments foreign key updated to SET NULL on delete' AS status;
