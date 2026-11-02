CREATE TABLE messaging.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  conversation_key text NOT NULL,
  post_token text NOT NULL CHECK (post_token ~ '^[A-Za-z0-9_-]{4,64}$'),
  context text NOT NULL DEFAULT 'listing' CHECK (context IN ('listing', 'support', 'system')),
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'closed', 'restricted')),
  last_sequence bigint NOT NULL DEFAULT 0 CHECK (last_sequence >= 0),
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id, conversation_key)
);

CREATE TABLE messaging.conversation_participants (
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  conversation_id uuid NOT NULL REFERENCES messaging.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('buyer', 'seller', 'support', 'system')),
  last_delivered_sequence bigint NOT NULL DEFAULT 0 CHECK (last_delivered_sequence >= 0),
  last_read_sequence bigint NOT NULL DEFAULT 0 CHECK (last_read_sequence >= 0),
  muted_until timestamptz,
  archived_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (conversation_id, user_id),
  CONSTRAINT participant_receipt_order CHECK (last_read_sequence <= last_delivered_sequence OR last_delivered_sequence = 0)
);

CREATE INDEX conversation_participant_inbox_idx
ON messaging.conversation_participants (tenant_id, user_id, archived_at, conversation_id);

CREATE INDEX conversation_recent_idx
ON messaging.conversations (tenant_id, last_message_at DESC NULLS LAST, id);

CREATE TABLE messaging.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  client_message_id text NOT NULL CHECK (client_message_id ~ '^[A-Za-z0-9_-]{8,128}$'),
  sequence bigint NOT NULL CHECK (sequence > 0),
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
  body text NOT NULL CHECK (octet_length(body) BETWEEN 1 AND 4096),
  moderation_state text NOT NULL DEFAULT 'accepted' CHECK (moderation_state IN ('accepted', 'pending', 'rejected', 'redacted')),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (created_at, id),
  CONSTRAINT message_conversation_fk FOREIGN KEY (conversation_id) REFERENCES messaging.conversations(id) ON DELETE CASCADE
) PARTITION BY RANGE (created_at);

CREATE TABLE messaging.messages_default
PARTITION OF messaging.messages DEFAULT;

CREATE INDEX messages_conversation_sequence_idx
ON messaging.messages (tenant_id, conversation_id, sequence DESC);

CREATE INDEX messages_sender_time_idx
ON messaging.messages (tenant_id, sender_id, created_at DESC);

CREATE TABLE messaging.message_idempotency (
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  conversation_id uuid NOT NULL REFERENCES messaging.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  client_message_id text NOT NULL,
  message_id uuid NOT NULL,
  message_created_at timestamptz NOT NULL,
  sequence bigint NOT NULL CHECK (sequence > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, conversation_id, sender_id, client_message_id),
  CONSTRAINT idempotency_message_fk FOREIGN KEY (message_created_at, message_id) REFERENCES messaging.messages(created_at, id) ON DELETE CASCADE
);

CREATE TABLE messaging.user_blocks (
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  revoked_at timestamptz,
  PRIMARY KEY (tenant_id, blocker_id, blocked_id),
  CONSTRAINT block_distinct_users CHECK (blocker_id <> blocked_id)
);

CREATE INDEX user_blocks_active_idx
ON messaging.user_blocks (tenant_id, blocked_id, blocker_id)
WHERE revoked_at IS NULL;

CREATE TABLE messaging.conversation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  conversation_id uuid NOT NULL REFERENCES messaging.conversations(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('fraud', 'harassment', 'spam', 'prohibited', 'other')),
  details text CHECK (octet_length(details) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  resolved_at timestamptz
);

CREATE INDEX conversation_reports_queue_idx
ON messaging.conversation_reports (tenant_id, status, created_at);

ALTER TABLE messaging.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging.conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE messaging.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging.conversation_participants FORCE ROW LEVEL SECURITY;
ALTER TABLE messaging.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging.messages FORCE ROW LEVEL SECURITY;
ALTER TABLE messaging.message_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging.message_idempotency FORCE ROW LEVEL SECURITY;
ALTER TABLE messaging.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging.user_blocks FORCE ROW LEVEL SECURITY;
ALTER TABLE messaging.conversation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging.conversation_reports FORCE ROW LEVEL SECURITY;

CREATE POLICY conversations_tenant_isolation ON messaging.conversations
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY participants_tenant_isolation ON messaging.conversation_participants
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY messages_tenant_isolation ON messaging.messages
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY message_idempotency_tenant_isolation ON messaging.message_idempotency
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY user_blocks_tenant_isolation ON messaging.user_blocks
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY conversation_reports_tenant_isolation ON messaging.conversation_reports
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
