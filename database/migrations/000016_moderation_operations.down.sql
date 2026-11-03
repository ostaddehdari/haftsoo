DROP TABLE IF EXISTS moderation.quality_reviews,moderation.escalations,moderation.sla_policies,moderation.case_events,moderation.user_reports;
DROP INDEX IF EXISTS moderation.moderation_claim_expiry_idx;
DROP INDEX IF EXISTS moderation.moderation_operations_queue_idx;
ALTER TABLE moderation.cases DROP COLUMN IF EXISTS last_activity_at,DROP COLUMN IF EXISTS escalation_level,DROP COLUMN IF EXISTS claim_expires_at,DROP COLUMN IF EXISTS sla_breached_at,DROP COLUMN IF EXISTS sla_due_at,DROP COLUMN IF EXISTS report_count,DROP COLUMN IF EXISTS risk_band,DROP COLUMN IF EXISTS source;
DROP INDEX IF EXISTS moderation.moderation_case_active_idx;
CREATE UNIQUE INDEX moderation_case_active_idx ON moderation.cases(tenant_id,post_id) WHERE state IN ('open','claimed','appealed');
ALTER TABLE moderation.cases DROP CONSTRAINT cases_state_check;
ALTER TABLE moderation.cases ADD CONSTRAINT cases_state_check CHECK (state IN ('open','claimed','appealed','resolved','cancelled'));

