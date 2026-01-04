# Database Migration Scripts

This directory contains SQL migration scripts to update the database schema to match the new Drizzle schema from bun-social.

## Execution Order

Run these scripts in order:

1. **001_add_rate_limiting_fields_to_users.sql**
   - Adds `failed_login_attempts`, `last_failed_login`, `locked_until` to users table
   - Safe to run on existing database

2. **002_update_comments_foreign_key.sql**
   - Updates comments.user_id foreign key to SET NULL on delete
   - Makes user_id nullable
   - Comments will be preserved when user is deleted

3. **003_add_post_id_to_media.sql**
   - Adds `post_id` column to media table
   - Creates foreign key and index
   - Replaces media_relations table functionality

4. **004_add_posts_image_id_foreign_key.sql**
   - Adds foreign key constraint for posts.image_id
   - Checks if constraint exists first (safe to re-run)

5. **005_add_performance_indexes.sql**
   - Creates 9 performance indexes across tables
   - Uses IF NOT EXISTS (safe to re-run)

6. **006_update_groups_users_notification_type.sql**
   - Converts existing 'weekly' values to 'daily'
   - Updates enum to remove 'weekly' option

## How to Run

### Option 1: MySQL Command Line
```bash
mysql -u your_user -p your_database < 001_add_rate_limiting_fields_to_users.sql
mysql -u your_user -p your_database < 002_update_comments_foreign_key.sql
mysql -u your_user -p your_database < 003_add_post_id_to_media.sql
mysql -u your_user -p your_database < 004_add_posts_image_id_foreign_key.sql
mysql -u your_user -p your_database < 005_add_performance_indexes.sql
mysql -u your_user -p your_database < 006_update_groups_users_notification_type.sql
```

### Option 2: All at Once
```bash
cat 00*.sql | mysql -u your_user -p your_database
```

### Option 3: Database GUI
Use Querious, Sequel Pro, MySQL Workbench, or any MySQL client to execute each script.

## Verification

After running all migrations, verify with:

```sql
-- Check users table
DESCRIBE users;

-- Check comments foreign key
SHOW CREATE TABLE comments;

-- Check media table
DESCRIBE media;

-- Check indexes
SHOW INDEX FROM posts WHERE Key_name LIKE 'idx_%';
SHOW INDEX FROM comments WHERE Key_name LIKE 'idx_%';
SHOW INDEX FROM media WHERE Key_name = 'idx_media_postId';

-- Check groups_users enum
SHOW COLUMNS FROM groups_users WHERE Field = 'type';
```

## Rollback (if needed)

These migrations make schema changes that are difficult to rollback automatically. If you need to rollback:

1. Restore from backup
2. Or manually reverse each change (see comments in each script)

## Notes

- All scripts include status messages for verification
- Scripts 004 and 005 are safe to re-run (idempotent)
- Script 006 includes data migration (weekly → daily)
- No data loss expected from any migration
