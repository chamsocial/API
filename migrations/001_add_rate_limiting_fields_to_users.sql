-- Migration: Add rate limiting fields to users table
-- Created: 2026-01-03
-- Purpose: Add brute force protection fields for login attempts

ALTER TABLE `users`
ADD COLUMN `failed_login_attempts` int unsigned NOT NULL DEFAULT 0 AFTER `last_login`,
ADD COLUMN `last_failed_login` timestamp NULL AFTER `failed_login_attempts`,
ADD COLUMN `locked_until` timestamp NULL AFTER `last_failed_login`;

-- Verify the changes
SELECT 'Migration completed: Rate limiting fields added to users table' AS status;
