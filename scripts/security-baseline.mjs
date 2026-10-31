import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const fail = (message) => { throw new Error(`[security-baseline] ${message}`); };
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const required = [
  "security/identity-model.json", "security/authorization-catalog.json", "security/session-policy.json",
  "security/service-auth-policy.json", "security/http-policy.json", "security/rate-limit-policy.json",
  "security/audit-policy.json", "security/data-flow.json", "security/threat-model.json"
];
for (const file of required) if (!existsSync(file)) fail(`missing ${file}`);

const identity = json("security/identity-model.json");
const authorization = json("security/authorization-catalog.json");
const session = json("security/session-policy.json");
const service = json("security/service-auth-policy.json");
const http = json("security/http-policy.json");
const rateLimit = json("security/rate-limit-policy.json");
const audit = json("security/audit-policy.json");
const threats = json("security/threat-model.json");

if (identity.principalTypes.length !== 5 || !identity.boundaries.humanAndServiceIdentitySeparated) fail("principal separation is incomplete");
if (authorization.defaultDecision !== "deny") fail("authorization must default to deny");
if (authorization.roles.some((role) => role.permissions.includes("*"))) fail("wildcard permission is forbidden");
if (!session.refreshToken.reuseDetection || !session.refreshToken.storedAsHash) fail("refresh-token defenses are incomplete");
if (!session.browserSession.cookie.secure || !session.browserSession.cookie.httpOnly) fail("browser cookie is not hardened");
if (!service.nonce.singleUse || service.maximumClockSkewSeconds > 60) fail("service replay policy is too weak");
if (!http.cors.wildcardForbidden || http.cors.defaultOrigins.some((origin) => origin === "*")) fail("wildcard CORS is forbidden");
if (rateLimit.productionStore !== "redis-atomic-script") fail("production rate limit must be distributed and atomic");
if (!audit.storage.appendOnly || !audit.storage.wormArchive) fail("audit storage must be append-only and WORM archived");

const stride = new Set(threats.threats.map((threat) => threat.category));
for (const category of ["spoofing", "tampering", "repudiation", "information-disclosure", "denial-of-service", "elevation-of-privilege"]) {
  if (!stride.has(category)) fail(`STRIDE category absent: ${category}`);
}

const ignored = new Set([".git", "node_modules", "dist", ".nuxt", ".output"]);
const riskyAssignment = /\b(password|secret|access[_-]?token|private[_-]?key)\s*[:=]\s*["'][^"'$<{][^"']{7,}["']/i;
function inspect(directory) {
  for (const name of readdirSync(directory)) {
    if (ignored.has(name) || (directory === "." && name === "package-lock.json")) continue;
    const file = path.join(directory, name);
    const status = statSync(file);
    if (status.isDirectory()) inspect(file);
    else if (/\.(?:json|mjs|ts|yaml|yml)$/.test(name)) {
      const content = readFileSync(file, "utf8");
      if (riskyAssignment.test(content) && !file.includes("test/")) fail(`possible embedded credential in ${file}`);
    }
  }
}
inspect(".");

console.log("Security baseline passed: default-deny IAM, hardened sessions, service replay defense, STRIDE and tamper-evident audit.");
