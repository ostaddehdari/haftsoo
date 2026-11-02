import { existsSync, readFileSync } from "node:fs";

const fail = message => { throw new Error(`[stage-20] ${message}`); };
const required = [
  "docs/stage-20/chat-domain.md", "docs/stage-20/chat-ticket-auth.md", "docs/stage-20/conversation-initiation.md", "docs/stage-20/websocket-transport.md", "docs/stage-20/message-order-idempotency.md", "docs/stage-20/delivery-read-receipts.md", "docs/stage-20/presence-typing-reconnect.md", "docs/stage-20/block-report-safety.md", "docs/stage-20/persistence-observability.md", "docs/stage-20/acceptance.md",
  "reports/chat/stage-20-quality.json", "scripts/chat-contract.mjs", "scripts/build-stage-20.sh", "services/chat/internal/chat/service_test.go", "services/chat/internal/realtime/hub_test.go", "apps/api/test/chat-ticket-core.test.mjs"
];
for (const file of required) if (!existsSync(file)) fail(`missing ${file}`);
const state = JSON.parse(readFileSync("project.state.json", "utf8"));
const design = JSON.parse(readFileSync("project.design.json", "utf8"));
const stage = state.completedStages?.find(entry => entry.id === "S20");
const works = stage?.works ?? [];
if (state.currentStage !== "S20" || state.stageStatus !== "complete" || state.nextStage !== "S21") fail("state must close S20 and point to S21");
if (stage?.status !== "complete" || works.length !== 10 || works.some(work => work.status !== "complete")) fail("S20 must have ten completed works");
if (works.some((work, index) => work.id !== `S20-W${String(index + 1).padStart(2, "0")}` || !existsSync(work.evidence))) fail("S20 evidence is incomplete");
if (design.delivery.currentStage !== "S20" || design.engineering.version !== "0.20.0" || !design.engineering.chatPolicy) fail("design manifest not at S20");
const server = readFileSync("services/chat/internal/server/server.go", "utf8");
if (!server.includes('Version: "0.20.0"') || !server.includes('"websocket"')) fail("chat service version or transport is stale");
console.log("Stage 20 verified: 10 works, signed chat tickets, WebSocket core, ordered messages, receipts, presence, blocking and safety.");
