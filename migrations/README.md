# Database Migrations

All migrations are combined into a single idempotent script: `combined.sql`.

## What It Does

1. Adds rate limiting fields to users table
2. Updates comments FK to SET NULL on user delete
3. Adds FK + index on media.post_id, backfills from media_relations
4. Adds 8 performance indexes
5. Adds CASCADE FKs for user deletion (posts + blog)
6. Removes unused posts.image_id column

## How to Run

```bash
mysql -u your_user -p your_database < combined.sql
```

The script is safe to run multiple times (fully idempotent).

## Verification

```sql
DESCRIBE users;
SHOW CREATE TABLE comments;
DESCRIBE media;
SHOW INDEX FROM posts WHERE Key_name LIKE 'idx_%';
```

## Rollback

Restore from backup:
```bash
mysql -u your_user -p your_database < backup.sql
```
