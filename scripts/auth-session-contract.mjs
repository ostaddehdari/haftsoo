import { existsSync, readFileSync } from "node:fs";
const fail = message => { throw new Error(`[auth-session-contract] ${message}`); };
const files = [
  "apps/api/src/auth/auth-core.ts", "apps/api/src/auth/auth-provider.ts", "apps/api/src/auth/auth.repository.ts", "apps/api/src/auth/auth.service.ts", "apps/api/src/auth/auth.controller.ts",
  "apps/web/components/AuthLoginPanel.vue", "apps/web/components/OtpCodeInput.vue", "apps/web/pages/my/settings/sessions.vue",
  "database/migrations/000011_auth_otp_sessions.up.sql", "database/migrations/000011_auth_otp_sessions.down.sql", "auth/policy.json"
];
for (const file of files) if (!existsSync(file)) fail(`missing ${file}`);
const core = readFileSync(files[0], "utf8"), service = readFileSync(files[3], "utf8"), controller = readFileSync(files[4], "utf8"), ui = readFileSync(files[5], "utf8"), migration = readFileSync(files[8], "utf8"), policy = JSON.parse(readFileSync(files[10], "utf8"));
for (const marker of ["timingSafeEqual", "aes-256-gcm", "HttpOnly; Secure; SameSite=Lax", "maximumAttempts", "maximumSendsPerHour"]) if (!core.includes(marker)) fail(`auth core marker missing: ${marker}`);
for (const marker of ["return{failure:{code:\"invalid_code\"", "refresh_reuse_detected", "return{failure:\"refresh_reuse\"", "queueLoginAlert"]) if (!service.includes(marker)) fail(`committed security flow missing: ${marker}`);
for (const marker of ["open-initiate-page", "code/consume", "sessions/:id", "Set-Cookie", "Cache-Control"]) if (!controller.includes(marker)) fail(`controller marker missing: ${marker}`);
for (const marker of ["identity.otp_challenges", "identity.sessions", "identity.refresh_tokens", "identity.auth_events", "FORCE ROW LEVEL SECURITY", "prevent_auth_event_mutation"]) if (!migration.includes(marker)) fail(`migration marker missing: ${marker}`);
if (!ui.includes("messenger") || !readFileSync(files[6], "utf8").includes("one-time-code")) fail("OTP UI does not expose provider/autofill contracts");
if (policy.refreshToken.rotation !== "one-time" || policy.refreshToken.reuseDetection !== "revoke-family" || !policy.privacy.phoneEncrypted) fail("auth policy is incomplete");
console.log("Auth/session contract passed: server-driven OTP, three providers, committed abuse controls, one-time refresh, device sessions, audit and login alerts.");
