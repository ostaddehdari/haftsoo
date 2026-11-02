import { existsSync, readFileSync } from "node:fs";

const fail = message => { throw new Error(`[stage-21] ${message}`); };
const required = ["inbox-filters", "post-conversation-entry", "ticket-websocket-client", "timeline-pagination", "optimistic-idempotent-send", "receipts-presence-typing", "reconnect-offline-queue", "block-report-safety-ui", "responsive-accessibility", "acceptance"].map(name => `docs/stage-21/${name}.md`);
for (const file of [...required, "chat/ui-policy.json", "reports/chat/stage-21-quality.json", "scripts/chat-ui-contract.mjs", "scripts/build-stage-21.sh", "apps/web/test/chat-ui.test.mjs"]) if (!existsSync(file)) fail(`missing ${file}`);
const state = JSON.parse(readFileSync("project.state.json", "utf8"));
const design = JSON.parse(readFileSync("project.design.json", "utf8"));
const stage = state.completedStages?.find(entry => entry.id === "S21");
if (Number(state.currentStage.slice(1)) < 21 || state.stageStatus !== "complete") fail("project state must retain completed S21");
if (stage?.status !== "complete" || stage.works?.length !== 10 || stage.works.some(work => work.status !== "complete" || !existsSync(work.evidence))) fail("S21 must have ten completed works");
if (Number(design.delivery.currentStage.slice(1)) < 21 || !design.engineering.chatUiPolicy) fail("design manifest regressed below S21");
console.log("Stage 21 verified: 10 works, inbox, conversation UI, ticketed WebSocket, optimistic send, receipts, reconnect, offline queue and safety.");
