import assert from "node:assert/strict";
import test from "node:test";
import securityCore from "../dist/security/security-core.js";

const {
  NonceReplayGuard,
  SlidingWindowRateLimiter,
  appendAuditEvent,
  authorize,
  createServiceSignature,
  evaluateDeviceTrust,
  verifyAuditChain,
  verifyServiceSignature
} = securityCore;

test("authorization defaults to deny and enforces scope", () => {
  const principal = { id: "u1", type: "user", roles: ["member"], tenantId: "public", scopes: ["self"] };
  assert.equal(authorize(principal, "listing:create", "self"), true);
  assert.equal(authorize(principal, "finance:ledger:read"), false);
  assert.equal(authorize(principal, "listing:create", "platform"), false);
});

test("device trust escalates and denies risky signals", () => {
  assert.deepEqual(evaluateDeviceTrust({ knownDevice: true, attested: true, recentFailures: 0, ipVelocityKph: 0 }), { score: 0, action: "allow" });
  assert.equal(evaluateDeviceTrust({ knownDevice: false, attested: false, recentFailures: 3, ipVelocityKph: 1000 }).action, "deny");
});

test("service signatures reject expiry and replay", () => {
  const signingMaterial = "test-only-service-signing-material";
  const input = { service: "chat", method: "GET", path: "/api/v1/security/service-auth-check", timestamp: 2_000, nonce: "nonce_abcdefghijklmnop" };
  const signature = createServiceSignature(input, signingMaterial);
  assert.equal(verifyServiceSignature(input, signature, signingMaterial, new Set(["chat"]), 2_030), true);
  assert.equal(verifyServiceSignature(input, signature, signingMaterial, new Set(["chat"]), 2_061), false);
  const replay = new NonceReplayGuard();
  assert.equal(replay.accept("chat", input.nonce, 2_060, 2_000), true);
  assert.equal(replay.accept("chat", input.nonce, 2_060, 2_001), false);
});

test("sliding window returns deterministic retry guidance", () => {
  const limiter = new SlidingWindowRateLimiter(2, 1_000);
  assert.equal(limiter.consume("actor", 1_000).allowed, true);
  assert.equal(limiter.consume("actor", 1_100).allowed, true);
  const denied = limiter.consume("actor", 1_200);
  assert.equal(denied.allowed, false);
  assert.equal(denied.retryAfterMilliseconds, 800);
  assert.equal(limiter.consume("actor", 2_001).allowed, true);
});

test("audit chain detects event tampering", () => {
  const signingMaterial = "test-only-audit-signing-material";
  const firstEvent = { id: "e1", occurredAt: "2026-10-31T00:00:00Z", actorId: "u1", actorType: "user", action: "listing.create", resource: "listing:l1", requestId: "r1", outcome: "success" };
  const secondEvent = { ...firstEvent, id: "e2", action: "listing.publish", requestId: "r2" };
  const first = appendAuditEvent(undefined, firstEvent, signingMaterial);
  const second = appendAuditEvent(first, secondEvent, signingMaterial);
  assert.equal(verifyAuditChain([first, second], signingMaterial), true);
  assert.equal(verifyAuditChain([first, { ...second, event: { ...second.event, outcome: "failure" } }], signingMaterial), false);
});
