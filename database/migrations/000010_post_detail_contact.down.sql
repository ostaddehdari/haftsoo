DROP TABLE IF EXISTS audit.post_actions;
DROP TABLE IF EXISTS moderation.post_reports;
DROP TABLE IF EXISTS listing.post_notes;
DROP TABLE IF EXISTS listing.post_bookmarks;
DROP TABLE IF EXISTS listing.post_contact_reveals;
DROP INDEX IF EXISTS listing.posts_public_location_idx;
DROP INDEX IF EXISTS listing.posts_public_token_idx;
ALTER TABLE listing.posts DROP COLUMN IF EXISTS seller_profile,DROP COLUMN IF EXISTS location_precision_m,DROP COLUMN IF EXISTS location,DROP COLUMN IF EXISTS slug,DROP COLUMN IF EXISTS public_token;
