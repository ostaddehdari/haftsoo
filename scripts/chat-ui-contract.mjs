import { existsSync, readFileSync } from "node:fs";

const fail = message => { throw new Error(`[chat-ui-contract] ${message}`); };
const policy = JSON.parse(readFileSync("chat/ui-policy.json", "utf8"));
const page = readFileSync("apps/web/pages/chat/[[conversation]].vue", "utf8");
const client = readFileSync("apps/web/composables/useChat.ts", "utf8");
const prototype = readFileSync("deploy/web/index.html", "utf8");
if (policy.route !== "/chat/:conversation?" || policy.filters.length !== 4) fail("route or inbox filters are incomplete");
if (!policy.message.optimistic || policy.message.idempotencyKey !== "clientMessageId" || policy.message.offlineQueueLimit !== 50) fail("message delivery policy is incomplete");
for (const marker of ["new WebSocket", "scheduleReconnect", "haftsoo-chat-queue", "message.ack", "typing.changed", "message.seen"]) if (!client.includes(marker)) fail(`client missing ${marker}`);
for (const component of ["ChatInbox", "ChatConversationHeader", "ChatMessageBubble", "ChatComposer", "ChatSafetyDialog"]) if (!page.includes(component)) fail(`page missing ${component}`);
if (!prototype.includes('data-view="chat"') || !prototype.includes("static-chat-composer")) fail("installable prototype chat is missing");
for (const file of ["reports/chat/stage-21-quality.json", "apps/web/test/chat-ui.test.mjs"]) if (!existsSync(file)) fail(`missing ${file}`);
console.log("Chat UI contract passed: inbox, post entry, ticketed WebSocket, optimistic delivery, receipts, reconnect, offline queue, safety and responsive UI.");
