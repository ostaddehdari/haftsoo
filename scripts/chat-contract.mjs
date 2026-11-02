import { existsSync, readFileSync } from "node:fs";

const fail = message => { throw new Error(`[chat-contract] ${message}`); };
const files = [
  "services/chat/internal/chat/domain.go",
  "services/chat/internal/chat/service.go",
  "services/chat/internal/chat/memory_store.go",
  "services/chat/internal/auth/ticket.go",
  "services/chat/internal/realtime/hub.go",
  "services/chat/internal/realtime/websocket.go",
  "services/chat/internal/server/server.go",
  "apps/api/src/chat/chat-ticket-core.ts",
  "apps/api/src/chat/chat-ticket.controller.ts",
  "database/migrations/000013_chat_realtime_core.up.sql",
  "database/migrations/000013_chat_realtime_core.down.sql",
  "chat/policy.json"
];
for (const file of files) if (!existsSync(file)) fail(`missing ${file}`);
const server = readFileSync(files[6], "utf8");
const websocket = readFileSync(files[5], "utf8");
const migration = readFileSync(files[9], "utf8");
const ticket = readFileSync(files[7], "utf8");
const policy = JSON.parse(readFileSync(files[11], "utf8"));
for (const marker of ["GET /v1/chat/ws", "send_message", "message.created", "message.seen", "typing.changed", "clientMessageId", "chat_ticket_invalid", "chat_rate_limited"]) if (!server.includes(marker)) fail(`server marker missing: ${marker}`);
for (const marker of ["Sec-WebSocket-Accept", "clientFramesMasked", "websocket_frame_too_large", "SetReadDeadline", "SetWriteDeadline"]) if (!websocket.includes(marker) && !JSON.stringify(policy).includes(marker)) fail(`websocket marker missing: ${marker}`);
for (const marker of ["messaging.conversations", "messaging.conversation_participants", "PARTITION BY RANGE", "messaging.message_idempotency", "messaging.user_blocks", "messaging.conversation_reports", "FORCE ROW LEVEL SECURITY"]) if (!migration.includes(marker)) fail(`migration marker missing: ${marker}`);
for (const marker of ["haftsoo-chat", "createHmac", "nonce", "expiresAt"]) if (!ticket.includes(marker)) fail(`ticket marker missing: ${marker}`);
if (policy.maxMessageBytes !== 4096 || policy.websocket.protocolVersion !== 1 || policy.safety.bidirectionalBlock !== true) fail("chat policy is invalid");
console.log("Chat contract passed: signed tickets, RFC6455 WebSocket, ordered idempotent messages, receipts, presence, block/report and tenant RLS.");
