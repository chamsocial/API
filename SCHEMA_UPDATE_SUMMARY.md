# Schema Update Summary - API Project

## Overview
Successfully updated the Sequelize models to match the new Drizzle schema from the `bun-social` project.

## Changes Completed

### 1. SQL Migration Script Created
Location: `./migrations/`

Seven migrations combined into a single idempotent script (see migrations/README.md for execution instructions):
- **combined.sql** - All schema changes in one file (001-007)

### 2. Sequelize Model Updates

#### users.js
**Removed:**
- `old_uid` field (legacy migration field)
- `avatarpath` field (handled differently now)

**Added:**
- `failed_login_attempts` (INTEGER UNSIGNED, default 0)
- `last_failed_login` (DATE, nullable)
- `locked_until` (DATE, nullable)

#### comment.js
**Changed:**
- `user_id` now nullable (allowNull: true)
- Added `onDelete: 'SET NULL'` behavior
- Added `onUpdate: 'CASCADE'` behavior
- Comments will be preserved when user is deleted

#### media.js
**Added:**
- `post_id` field (INTEGER UNSIGNED, nullable)
- Foreign key to posts.id
- `onDelete: 'CASCADE'` and `onUpdate: 'CASCADE'`

#### posts.js
**Changed:**
- Updated `hasMediaAttribute` query to use `media.post_id` instead of `media_relations`
- Added check for `deleted_at IS NULL` in media query

#### groups.js
**Added:**
- `description` field (TEXT, required)
- `slug` field (STRING, required, unique)
- `title` field (STRING, required)

#### groupsUsers.js
**Changed:**
- Removed `'weekly'` from type enum
- Updated default value to `'direct'` (was `'none'`)
- Valid values now: `'none'`, `'direct'`, `'daily'`

#### index.js (associations)
**Removed:**
- MediaRelations associations (Post belongsToMany Media through MediaRelations)

**Added:**
- Direct Media → Post relationship via `post_id`
- `db.Media.Post = db.Media.belongsTo(db.Post, { foreignKey: 'post_id' })`
- `db.Post.Media = db.Post.hasMany(db.Media, { foreignKey: 'post_id' })`

### 3. Deprecated Models
**Status:** All deprecated model files have already been removed
- No mediaRelations.js, groupsContent.js, or other deprecated models found
- Models directory is clean

### 4. GraphQL Code Review
**Status:** All GraphQL queries and types are clean
- No references to `media_relations` found
- No references to `groups_content` found
- No references to `'weekly'` notification type found
- GraphQL type definitions are current and correct

## Next Steps - Database Migration

### Step 1: Backup Database
```bash
mysqldump -u your_user -p your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run SQL Migrations
```bash
mysql -u your_user -p your_database < ./migrations/combined.sql
```

### Step 3: Verify Database Changes
```sql
-- Check users table
DESCRIBE users;
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'users'
AND COLUMN_NAME IN ('failed_login_attempts', 'last_failed_login', 'locked_until');

-- Check comments foreign key
SHOW CREATE TABLE comments;

-- Check media table
DESCRIBE media;
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'media' AND COLUMN_NAME = 'post_id';

-- Check indexes
SHOW INDEX FROM posts WHERE Key_name LIKE 'idx_%';
SHOW INDEX FROM comments WHERE Key_name LIKE 'idx_%';
SHOW INDEX FROM media WHERE Key_name = 'idx_media_postId';

-- Check groups_users enum
SHOW COLUMNS FROM groups_users WHERE Field = 'type';
```

### Step 4: Test API
```bash
cd /path/to/API

# Start API server
npm start

# Test key endpoints:
# - Query posts with media
# - Test user deletion (comments should remain with null user_id)
# - Test notification preferences (no weekly option)
```

## Breaking Changes

### 1. Notification Type Enum
- The `'weekly'` notification type has been removed
- Migration script automatically converts existing `'weekly'` values to `'daily'`
- Any code that explicitly checks for `'weekly'` should be updated

### 2. Comment User Relationship
- Comments can now have null `user_id` (when user is deleted)
- Code that assumes `user_id` is always present needs null checks
- Example:
  ```javascript
  // Before
  comment.user_id // always had a value

  // After
  comment.user_id || null // could be null if user deleted
  ```

### 3. Media Relations
- Direct relationship via `post_id` instead of `media_relations` table
- Any code that queries `media_relations` needs to be updated
- Example:
  ```javascript
  // Before
  SELECT * FROM media_relations WHERE id = ?

  // After
  SELECT * FROM media WHERE post_id = ?
  ```

## Files Modified

### Created:
- `./migrations/combined.sql`

### Modified:
- `./models/users.js`
- `./models/comment.js`
- `./models/media.js`
- `./models/posts.js`
- `./models/groups.js`
- `./models/groupsUsers.js`
- `./models/index.js`

## Rollback Plan

If you need to rollback:
1. Restore from backup: `mysql -u your_user -p your_database < backup_YYYYMMDD_HHMMSS.sql`
2. Revert git changes to model files: `git checkout HEAD -- models/`

## Performance Improvements

The migration includes 9 new composite indexes:
- **Posts**: 3 indexes for status/groupId, status/userId, status/createdAt
- **Comments**: 2 indexes for postId/createdAt, createdAt
- **Messages**: 1 index for threadId/userId
- **Blog**: 1 index for status/authorId
- **GroupsUsers**: 1 index for userId/type
- **Media**: 1 index for postId

These indexes should significantly improve query performance for:
- Homepage feed queries
- Group page listings
- User profile pages
- Comment loading
- Message thread retrieval

## Migration Completed
All code changes have been completed successfully. The API models now match the Drizzle schema from bun-social.

**Date:** 2026-01-03
**Status:** Ready for database migration
