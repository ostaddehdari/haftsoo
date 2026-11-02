import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("OTP login and active sessions UI expose security and autofill contracts", () => {
  const auth = readFileSync(new URL("../composables/useAuth.ts", import.meta.url), "utf8");
  const input = readFileSync(new URL("../components/OtpCodeInput.vue", import.meta.url), "utf8");
  const login = readFileSync(new URL("../components/AuthLoginPanel.vue", import.meta.url), "utf8");
  const sessions = readFileSync(new URL("../pages/my/settings/sessions.vue", import.meta.url), "utf8");
  assert.match(auth, /credentials: "include"/);
  assert.match(auth, /Bearer/);
  assert.match(input, /one-time-code/);
  assert.match(login, /messenger/);
  assert.match(login, /cooldown/);
  assert.match(sessions, /revokeSession/);
  assert.match(sessions, /next=\/my\/settings\/sessions/);
});
