import { existsSync, readFileSync } from "node:fs";
const fail = message => { throw new Error(`[stage-18] ${message}`); };
const required = [
  "docs/stage-18/open-initiate-page.md", "docs/stage-18/delivery-providers.md", "docs/stage-18/consume-code-errors.md", "docs/stage-18/token-rotation.md", "docs/stage-18/devices-sessions.md", "docs/stage-18/logout-revocation.md", "docs/stage-18/anti-abuse-cooldown.md", "docs/stage-18/otp-ui-autofill.md", "docs/stage-18/audit-login-alerts.md", "docs/stage-18/acceptance.md",
  "reports/auth/stage-18-quality.json", "scripts/auth-session-contract.mjs", "scripts/build-stage-18.sh", "apps/api/test/auth-core.test.mjs", "apps/api/test/auth-provider.test.mjs", "apps/web/test/auth-login.test.mjs"
];
for (const file of required) if (!existsSync(file)) fail(`missing ${file}`);
const state = JSON.parse(readFileSync("project.state.json", "utf8")), design = JSON.parse(readFileSync("project.design.json", "utf8")), stage = state.completedStages?.find(entry => entry.id === "S18"), works = stage?.works ?? [];
if (Number(state.currentStage.slice(1)) < 18 || state.stageStatus !== "complete") fail("project state must retain completed S18");
if (stage?.status !== "complete" || works.length !== 10 || works.some(work => work.status !== "complete")) fail("S18 must have ten completed works");
if (works.some((work, index) => work.id !== `S18-W${String(index + 1).padStart(2, "0")}` || !existsSync(work.evidence))) fail("S18 evidence is incomplete");
if (Number(design.delivery.currentStage.slice(1)) < 18 || Number(design.engineering.version.split(".")[1]) < 18 || !design.engineering.authPolicy) fail("design manifest regressed below S18");
const html = readFileSync("deploy/web/index.html", "utf8"), js = readFileSync("deploy/web/app.js", "utf8");
if (!/stage(?:18-auth-1|19-account-1|21-chat-1|22-notification-1|23-moderation-1|24-operations-1|25-crm-1|26-finance-1|27-monetization-1|28-business-1|29-public-ui-1|30-control-plane-1|31-analytics-1|32-risk-1|33-sre-1|34-performance-1)/.test(html) || !html.includes("autocomplete=\"one-time-code\"") || !js.includes("auth_otp_consumed") || !js.includes("auth_session_revoked")) fail("installable auth UI not wired");
console.log("Stage 18 verified: 10 works, server-driven OTP, three delivery methods, rotation, active sessions, anti-abuse, audit and login alerts.");
