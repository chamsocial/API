# Database Migrations

Migrations 001-007 are combined into a single idempotent script: `combined.sql`.
Later migrations are separate numbered files, because they have to run at a
specific point relative to a deploy:

| File | Run |
|---|---|
| `combined.sql` | once (001-007, see below) |
| `008-email-message-id-nullable.sql` | **before** deploying the API that writes NULL to `email_message_id` |
| `009-email-message-id-unique.sql` | **after** that API and the matching MailServer release are both live |

## 008 and 009: unique email_message_id

The mail server stores each inbound email's Message-ID in
`posts.email_message_id` / `comments.email_message_id`. Two deliveries of one
email can race and both insert, so 009 adds unique keys
(`uq_posts_email_message_id`, `uq_comments_email_message_id`). Web posts and
comments used to store `''`, which a unique key would reject after the first
row, so they now store NULL.

Run order:

1. `008-email-message-id-nullable.sql`: makes the column nullable. The old code
   still works, since `''` stays valid. On `posts` this copies the table
   (FULLTEXT index) and blocks writes, for about a minute on a local copy of
   production, so pick a quiet time.
2. Deploy this API and the MailServer release that writes NULL instead of `''`.
   Deploying the API before 008 fails every web post and comment: it inserts
   an explicit NULL into a NOT NULL column.
3. `009-email-message-id-unique.sql`: converts `''` to NULL, clears duplicate
   Message-IDs (keeping the lowest id, originals saved in
   `email_message_id_dedupe_backup`) and adds the unique keys. Running it while
   any code still writes `''` breaks posting after the first such row.

```bash
mysql -u your_user -p your_database < 008-email-message-id-nullable.sql
# deploy API + MailServer
mysql -u your_user -p your_database < 009-email-message-id-unique.sql
```

Both are safe to rerun, and 009 aborts if 008 has not run. Each file ends with
a commented rollback section.

## combined.sql

### What It Does

1. Adds rate limiting fields to users table
2. Updates comments FK to SET NULL on user delete
3. Adds FK + index on media.post_id, backfills from media_relations
4. Adds 8 performance indexes
5. Adds CASCADE FKs for user deletion (posts + blog)
6. Removes unused posts.image_id column

### How to Run

```bash
mysql -u your_user -p your_database < combined.sql
```

The script is safe to run multiple times (fully idempotent).

### Verification

```sql
DESCRIBE users;
SHOW CREATE TABLE comments;
DESCRIBE media;
SHOW INDEX FROM posts WHERE Key_name LIKE 'idx_%';
```

### Rollback

Restore from backup:
```bash
mysql -u your_user -p your_database < backup.sql
```
