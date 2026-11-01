UPDATE listing.posts SET status = CASE
  WHEN status = 'needs_changes' THEN 'rejected'
  WHEN status = 'paused' THEN 'published'
  WHEN status IN ('archived','deleted') THEN 'expired'
  ELSE status END;

DROP TABLE IF EXISTS listing.post_lifecycle_requests;
DROP TABLE IF EXISTS listing.post_moderation_messages;
DROP TABLE IF EXISTS listing.post_transitions;
DROP TABLE IF EXISTS listing.post_versions;
DROP INDEX IF EXISTS listing.posts_soft_delete_job_idx;
DROP INDEX IF EXISTS listing.posts_expiration_job_idx;
DROP INDEX IF EXISTS listing.posts_owner_lifecycle_idx;
ALTER TABLE listing.posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE listing.posts
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS archived_at,
  DROP COLUMN IF EXISTS expires_at,
  DROP COLUMN IF EXISTS published_at,
  DROP COLUMN IF EXISTS moderation_message,
  DROP COLUMN IF EXISTS moderation_reason_code,
  DROP COLUMN IF EXISTS version,
  ADD CONSTRAINT posts_status_check CHECK (status IN ('pending_review','published','rejected','expired'));
