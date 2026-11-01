import assert from "node:assert/strict";
import test from "node:test";
import { assertTransition, stableSubmissionChecksum, validateSubmission, validIdempotencyKey } from "../dist/submission/submission-core.js";

const complete = { category: { key: "vehicle", slug: "cars", path: ["vehicles", "cars"] }, fields: { title: "پژو ۲۰۶ سالم", price: 500000000 }, location: { provinceKey: "10", cityKey: "1", neighborhoodKeys: ["101"] }, media: [], description: "خودروی سالم و آماده بازدید", contact: { phone: "09120000000", chatEnabled: true, phoneVisible: false }, privacy: { preciseLocationVisible: false }, consents: { terms: true, safeTrade: true } };

test("wizard permits adjacent transitions and rejects skipping", () => {
  assert.doesNotThrow(() => assertTransition("category", "details"));
  assert.throws(() => assertTransition("category", "media"), /invalid submission transition/);
});
test("complete sample validates and checksum is deterministic", () => {
  assert.deepEqual(validateSubmission(complete), []);
  assert.equal(stableSubmissionChecksum(complete), stableSubmissionChecksum({ ...complete }));
});
test("invalid payload reports user-facing paths and idempotency policy", () => {
  assert.ok(validateSubmission({}).length >= 5);
  assert.equal(validIdempotencyKey("draft:019afc0f-3bb1-7000-8000-000000000001"), true);
  assert.equal(validIdempotencyKey("short"), false);
});
