# 🔄 Data Synchronization Scripts

This directory contains SQL scripts to synchronize all aggregated data (upvotes, downvotes, views, comment counts) across your social media platform. These scripts ensure data consistency and accuracy.

## 📁 Files Overview

### `sync_aggregated_data.sql`
The main script containing all synchronization functions and monitoring views.

### `run_data_sync.sql`
A convenient wrapper script that runs the complete synchronization with progress reporting.

## 🎯 What Gets Synchronized

### Discussion Votes (Posts)
- **`upvotes`** - Total up votes from `discussion_votes` table
- **`downvotes`** - Total down votes from `discussion_votes` table

### Discussion Views
- **`views`** - Total unique views from `user_post_views` table

### Discussion Comments
- **`comment_count`** - Total comments from `comments` table

### Comment Votes
- **`upvotes`** - Total up votes on comments from `comment_votes` table
- **`downvotes`** - Total down votes on comments from `comment_votes` table

## 🚀 How to Run

### Option 1: Complete Sync (Recommended)
1. Copy the contents of `run_data_sync.sql`
2. Paste into **Supabase SQL Editor**
3. Click **Run** to execute

### Option 2: Individual Functions
Run these functions individually in Supabase SQL Editor:

```sql
-- Sync all data at once
SELECT * FROM sync_all_aggregated_data();

-- Or sync individual data types
SELECT * FROM sync_discussion_votes();
SELECT * FROM sync_discussion_views();
SELECT * FROM sync_discussion_comments();
SELECT * FROM sync_comment_votes();
```

### Option 3: Check Status Only
```sql
-- Check which records need syncing
SELECT * FROM data_sync_status;

-- View detailed sync status for discussions
SELECT * FROM sync_discussion_votes();

-- View detailed sync status for views
SELECT * FROM sync_discussion_views();
```

## 📊 Sample Output

```
📊 CURRENT DATA STATUS:
 table_name | total_records | needs_sync_count | synced_count | sync_percentage
------------+---------------+------------------+--------------+-----------------
 discussions|          150 |               23 |          127 |           84.67
 comments   |          450 |               12 |          438 |           97.33

🚀 STARTING DATA SYNCHRONIZATION...
=====================================
✅ discussion_votes: 15 updated, 135 unchanged
✅ discussion_views: 8 updated, 142 unchanged
✅ discussion_comments: 5 updated, 145 unchanged
✅ comment_votes: 7 updated, 443 unchanged
=====================================
🎉 SYNCHRONIZATION COMPLETE!
📈 Total records updated: 35
📊 Total records unchanged: 865
⏱️  All aggregated data is now accurate!

📊 FINAL DATA STATUS:
 table_name | total_records | needs_sync_count | synced_count | sync_percentage
------------+---------------+------------------+--------------+-----------------
 discussions|          150 |                0 |          150 |          100.00
 comments   |          450 |                0 |          450 |          100.00
```

## 🔧 Available Functions

### `sync_all_aggregated_data()`
Runs all synchronization functions in sequence and returns a summary.

**Returns:**
```sql
operation        | records_updated | records_unchanged
-----------------+-----------------+------------------
discussion_votes |              15 |               135
discussion_views |               8 |               142
discussion_comments|             5 |               145
comment_votes    |               7 |               443
```

### Individual Sync Functions

#### `sync_discussion_votes()`
Synchronizes upvotes/downvotes for all discussions.

**Returns:**
```sql
discussion_id | old_upvotes | new_upvotes | old_downvotes | new_downvotes | updated
--------------+-------------+-------------+---------------+---------------+---------
uuid-here    |          10 |          12 |             2 |             3 | t
uuid-here    |           5 |           5 |             1 |             1 | f
```

#### `sync_discussion_views()`
Synchronizes view counts for all discussions.

#### `sync_discussion_comments()`
Synchronizes comment counts for all discussions.

#### `sync_comment_votes()`
Synchronizes upvotes/downvotes for all comments.

## 📈 Monitoring View

### `data_sync_status`
Provides an overview of data synchronization status:

```sql
SELECT * FROM data_sync_status;

table_name | total_records | needs_sync_count | synced_count | sync_percentage
-----------+---------------+------------------+--------------+-----------------
discussions|          150 |                0 |          150 |          100.00
comments   |          450 |                0 |          450 |          100.00
```

## ⚡ Performance Features

### Smart Updates
- **Only updates changed records** - No unnecessary database writes
- **Atomic operations** - All-or-nothing updates per record
- **Batch processing** - Efficient bulk operations

### Monitoring
- **Progress reporting** - See what's being updated in real-time
- **Before/after comparison** - Track what changed
- **Performance timing** - Monitor execution speed

### Safety Features
- **Read-only analysis** - Check status without making changes
- **Detailed logging** - Track all changes made
- **Rollback friendly** - Easy to understand what was modified

## 🛠️ Usage Examples

### Check if sync is needed
```sql
SELECT * FROM data_sync_status WHERE needs_sync_count > 0;
```

### Sync specific data type
```sql
SELECT * FROM sync_discussion_votes();
```

### Full synchronization with monitoring
```sql
-- Run the complete script from run_data_sync.sql
```

### Monitor specific records
```sql
-- Check if a specific discussion needs syncing
SELECT
    d.id,
    d.upvotes as stored_upvotes,
    COALESCE(vc.upvotes, 0) as actual_upvotes,
    d.views as stored_views,
    COALESCE(viewc.views, 0) as actual_views
FROM discussions d
LEFT JOIN (SELECT discussion_id, SUM(CASE WHEN vote_type = 'up' THEN 1 END) as upvotes FROM discussion_votes GROUP BY discussion_id) vc ON vc.discussion_id = d.id
LEFT JOIN (SELECT post_id, COUNT(*) as views FROM user_post_views GROUP BY post_id) viewc ON viewc.post_id = d.id
WHERE d.id = 'your-discussion-id-here';
```

## 🚨 Important Notes

### Data Consistency
- **Run during low traffic** - Best to run when platform usage is minimal
- **Backup first** - Consider backing up before running on production
- **Monitor performance** - Large datasets may take time to process

### Automation
- **Schedule as needed** - Run whenever you suspect data inconsistencies
- **After bulk imports** - Essential after importing or migrating data
- **Regular maintenance** - Run monthly/quarterly for data hygiene

### Troubleshooting
- **Check permissions** - Ensure your user has EXECUTE permissions
- **Monitor logs** - Watch for any error messages in Supabase logs
- **Test first** - Run on a copy of production data if possible

## 📞 Support

If you encounter issues:
1. Check that all required tables exist (`discussions`, `comments`, `discussion_votes`, `comment_votes`, `user_post_views`)
2. Verify your user has the necessary permissions
3. Check Supabase logs for detailed error messages
4. Test individual functions before running the complete sync

---

**🎉 Your data synchronization system is ready! Run `run_data_sync.sql` in your Supabase SQL Editor to sync all aggregated data.**
