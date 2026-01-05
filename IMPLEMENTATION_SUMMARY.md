# Database Schema Fixes - Implementation Summary

**Date:** January 5, 2026
**Branch:** new-version-db-changes

## Overview
Fixed critical data integrity issues, null handling bugs, and orphaned file problems identified in the database schema and codebase analysis.

---

## ✅ Changes Completed

### 1. Fixed Critical Bugs

#### a) Comment.author Null Handling (CRASH FIX)
**File:** `routes/graphql/types.js`

**Problem:** When a user was deleted, their comments would have `user_id = NULL`, causing GraphQL to crash when loading the author.

**Solution:** Added `DELETED_USER` constant and updated resolver:
```javascript
const DELETED_USER = {
  id: 0,
  username: '[deleted]',
  slug: 'deleted',
  // ... other fields
}

// In Comment resolver:
author: comment => {
  if (!comment.user_id) return DELETED_USER
  return User.findByPk(comment.user_id)
}
```

**Impact:** Comments from deleted users now display "[deleted]" as the author instead of crashing.

---

#### b) Fixed Hardcoded User ID Bug
**File:** `routes/graphql/queries.js:212`

**Problem:** The `postsCommented` query had a hardcoded `user_id = 3506` instead of using the logged-in user's ID.

**Before:**
```sql
WHERE comments.user_id = 3506
```

**After:**
```sql
WHERE comments.user_id = ${me.id}
```

**Impact:** The query now correctly shows posts commented on by the logged-in user.

---

### 2. Added File and Thumbnail Cleanup Hook

**File:** `models/index.js`

**Problem:** When media records were cascade-deleted (e.g., when a post was deleted), the physical files AND generated thumbnails remained on disk, causing orphaned files.

**Solution:** Added `beforeDestroy` hook to Media model that cleans up:
1. Original uploaded file from `UPLOADS_DIR/{userId}/{filename}`
2. All generated thumbnails from `THUMBNAIL_DIR/{userId}/{height}/{width}/{filename}`

```javascript
db.Media.addHook('beforeDestroy', async media => {
  const filePath = path.resolve(UPLOADS_DIR, String(media.user_id), media.filename)

  // Delete original file
  try {
    await fsUnlink(filePath)
    console.log(`Deleted file: ${filePath}`)
  } catch (err) {
    logger.error('FILE_CLEANUP_ERROR', { error: err, filePath, fileId: media.id })
  }

  // Delete all generated thumbnails for this file
  if (THUMBNAIL_DIR) {
    const userThumbDir = path.resolve(THUMBNAIL_DIR, String(media.user_id))
    // Recursively scan and delete all thumbnails matching this filename
    await deleteThumbnailsRecursive(userThumbDir, media.filename)
  }
})
```

**Impact:**
- Physical files are now automatically deleted when media records are removed
- All generated thumbnails (any size) are also automatically cleaned up
- Prevents disk space waste from orphaned thumbnails

---

### 3. Updated Model Definitions

**Files Modified:**
- `models/posts.js`
- `models/media.js`
- `models/messages.js`
- `models/messagesSubscribers.js`
- `models/groupsUsers.js`
- `models/blog.js`
- `models/activation.js`

**Changes:** Added `onDelete: 'CASCADE'` and `onUpdate: 'CASCADE'` to all `user_id` and `author_id` foreign keys.

**Example:**
```javascript
user_id: {
  type: DataTypes.INTEGER.UNSIGNED,
  references: { model: 'users', key: 'id' },
  allowNull: false,
  onDelete: 'CASCADE',  // NEW
  onUpdate: 'CASCADE',  // NEW
}
```

**Impact:** Model definitions now match the database migrations for proper CASCADE behavior.

---

### 4. Created Database Migrations

#### Migration 006: User Deletion Cascades
**File:** `migrations/006_add_user_deletion_cascades.sql`

**Purpose:** Add CASCADE foreign keys to enable user deletion.

**Tables affected:**
- `posts` → CASCADE delete posts when user deleted
- `media` → CASCADE delete media when user deleted (files cleaned via hook)
- `messages` → CASCADE delete messages when user deleted
- `messages_subscribers` → CASCADE delete subscriptions when user deleted
- `groups_users` → CASCADE delete group memberships when user deleted
- `blog` → CASCADE delete blog posts when user deleted
- `activations` → CASCADE delete activation records when user deleted

**Note:** Comments use SET NULL (from migration 002), preserving comments with `[deleted]` user.

---

#### Migration 007: Remove posts.image_id
**File:** `migrations/007_remove_posts_image_id.sql`

**Purpose:** Remove unused `image_id` column from posts table.

**Reason:**
- Field exists in migration 004 but not in Sequelize model
- Not used anywhere in codebase
- Posts can have multiple media via `media.post_id` relationship

---

### 5. Created Orphaned File Cleanup Script

**File:** `scripts/cleanup-orphaned-files.js` (executable)

**Purpose:** One-time cleanup of existing orphaned files AND thumbnails on disk.

**Features:**
- Scans all files in uploads directory
- Scans all generated thumbnails in thumbnail directory
- Checks each file against media table
- Reports orphaned uploads and thumbnails separately
- Shows potential disk space recovery
- **Dry-run mode by default** (safe)
- `--delete` flag to actually remove files
- Generates detailed log file with breakdown

**Usage:**
```bash
# Check for orphaned files (dry run)
node scripts/cleanup-orphaned-files.js

# Actually delete orphaned files and thumbnails
node scripts/cleanup-orphaned-files.js --delete

# Show help
node scripts/cleanup-orphaned-files.js --help
```

**Output Example:**
```
=== CLEANUP SUMMARY ===
Orphaned uploads: 15
Orphaned thumbnails: 47
Total orphaned files: 62
Total size: 12.5 MB
Potential disk space recovery: 12.5 MB
```

---

## 🚀 Next Steps

### 1. Run Database Migrations

**IMPORTANT:** Run migrations in order on your database:

```bash
# Migration 006: Add CASCADE foreign keys for user deletion
mysql -u username -p database_name < migrations/006_add_user_deletion_cascades.sql

# Migration 007: Remove unused image_id column
mysql -u username -p database_name < migrations/007_remove_posts_image_id.sql
```

**Note:** Migration 002 (comments.user_id nullable) should already be run if you followed previous migrations.

---

### 2. Run Orphaned File Cleanup (Optional)

Clean up any existing orphaned files:

```bash
# First, do a dry run to see what would be deleted
node scripts/cleanup-orphaned-files.js

# Review the output and log file, then run with --delete if satisfied
node scripts/cleanup-orphaned-files.js --delete
```

---

### 3. Test User Deletion

After running migrations, test user deletion:

```sql
-- Test deleting a user (pick a test user)
DELETE FROM users WHERE id = <test_user_id>;

-- Verify CASCADE behavior:
-- ✅ Posts deleted
-- ✅ Media deleted (files cleaned up via hook)
-- ✅ Messages deleted
-- ✅ Message subscriptions deleted
-- ✅ Group memberships deleted
-- ✅ Blog posts deleted
-- ✅ Activation records deleted
-- ✅ Comments preserved with user_id = NULL (shown as [deleted])
```

---

### 4. Verify GraphQL Queries

Test that comments from deleted users display properly:

```graphql
query {
  post(slug: "some-post") {
    comments {
      content
      author {
        username  # Should return "[deleted]" for comments from deleted users
      }
    }
  }
}
```

---

## 📊 Summary of Issues Fixed

| Issue | Status | Impact |
|-------|--------|--------|
| Comment.author crashes with null user_id | ✅ Fixed | No more GraphQL crashes |
| Hardcoded user_id (3506) in postsCommented | ✅ Fixed | Query works for all users |
| Orphaned files when media cascade deleted | ✅ Fixed | Files & thumbnails auto-cleaned via hook |
| Orphaned thumbnails not cleaned up | ✅ Fixed | All thumbnails recursively deleted |
| User deletion impossible | ✅ Fixed | CASCADE enables user deletion |
| posts.image_id unused column | ✅ Fixed | Migration removes it |
| Existing orphaned files on disk | ✅ Script | Run cleanup script to recover space |

---

## 🔍 Additional Findings (Not Fixed)

Per your decision to focus on critical fixes only, the following were **NOT** addressed:

### Unused Tables (13 tables - 94 columns)
- `bounces`, `business`, `comments_content`, `email_log`, `event`, `groups_admins`, `groups_content`, `location`, `media_relations`, `posts_content`, `stats_sent_emails`, `translations`, `wiki`

### Unused Columns in Active Tables (44 columns)
- Migration fields: `old_nid`, `old_pid`, `old_cid`, `old_uid`, etc. (24 columns)
- Other unused: `comments.lang`, `media.filepath`, `media.deleted_at`, `users.email_domain`, `users.avatarpath`, `users.adminComments`, etc.

**Recommendation:** These can be cleaned up later if database size or performance becomes a concern.

---

## 🎯 Benefits Achieved

1. **Data Integrity:** User deletion now works properly with CASCADE behavior
2. **No More Crashes:** Null user_id in comments handled gracefully
3. **Disk Space:** Orphaned files AND thumbnails prevented (future) and can be cleaned (existing)
4. **Complete Cleanup:** Thumbnails at all sizes are automatically removed
5. **Bug Fixes:** Hardcoded user_id and unused column removed
6. **Maintainability:** Model definitions match database constraints

---

## ⚠️ Important Notes

1. **Backup Before Migrations:** Always backup your database before running migrations
2. **Test Environment First:** Test migrations on staging/dev before production
3. **Orphaned File Script:** Review dry-run output before using `--delete` flag
4. **User Deletion:** This is now permanent and cascades to all content (except comments)
5. **Comments Preserved:** Comments from deleted users show as "[deleted]" - this is intentional

---

## 📝 Files Changed

### Code Changes (7 files)
- `routes/graphql/types.js` - Added DELETED_USER and null handling
- `routes/graphql/queries.js` - Fixed hardcoded user_id
- `models/index.js` - Added Media cleanup hook
- `models/posts.js` - Added CASCADE behavior
- `models/media.js` - Added CASCADE behavior
- `models/messages.js` - Added CASCADE behavior
- `models/messagesSubscribers.js` - Added CASCADE behavior
- `models/groupsUsers.js` - Added CASCADE behavior
- `models/blog.js` - Added CASCADE behavior
- `models/activation.js` - Added CASCADE behavior

### New Files (3 files)
- `migrations/006_add_user_deletion_cascades.sql` - Database migration
- `migrations/007_remove_posts_image_id.sql` - Database migration
- `scripts/cleanup-orphaned-files.js` - Cleanup script

---

## 🤝 Support

If you encounter any issues:
1. Check migration logs for errors
2. Verify all environment variables are set (UPLOADS_DIR)
3. Test on a staging environment first
4. Review the implementation plan at `.claude/plans/iridescent-painting-quail.md`

---

**Implementation Complete! 🎉**
