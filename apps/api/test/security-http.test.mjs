import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import appModulePackage from "../dist/app.module.js";
import securityBootstrap from "../dist/security/security-bootstrap.js";
import securityCore from "../dist/security/security-core.js";

const { AppModule } = appModulePackage;
const { configureHttpSecurity } = securityBootstrap;
const { createServiceSignature } = securityCore;

test("HTTP security applies headers, CORS, service auth and replay protection", async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "haftsoo-security-"));
  const keyFile = join(temporaryDirectory, "service-auth-key");
  const signingMaterial = "test-only-http-signing-material";
  await writeFile(keyFile, signingMaterial, { mode: 0o600 });
  process.env.SERVICE_AUTH_KEY_FILE = keyFile;
  process.env.TRUSTED_SERVICE_NAMES = "chat";
  process.env.CORS_ALLOWED_ORIGINS = "https://srun.ir";

  const app = await NestFactory.create(AppModule, new FastifyAdapter(), { logger: false });
  app.setGlobalPrefix("api/v1");
  configureHttpSecurity(app);
  await app.init();
  const server = app.getHttpAdapter().getInstance();

  try {
    const baseline = await server.inject({ method: "GET", url: "/api/v1/security/baseline", headers: { origin: "https://srun.ir" } });
    assert.equal(baseline.statusCode, 200);
    assert.equal(baseline.headers["access-control-allow-origin"], "https://srun.ir");
    assert.match(baseline.headers["content-security-policy"], /default-src 'none'/);
    assert.equal(baseline.headers["x-content-type-options"], "nosniff");

    const timestamp = Math.floor(Date.now() / 1000);
    const input = { service: "chat", method: "GET", path: "/api/v1/security/service-auth-check", timestamp, nonce: "nonce_http_abcdefghijkl" };
    const signature = createServiceSignature(input, signingMaterial);
    const headers = {
      "x-haftsoo-service": input.service,
      "x-haftsoo-timestamp": String(timestamp),
      "x-haftsoo-nonce": input.nonce,
      "x-haftsoo-signature": signature
    };
    const accepted = await server.inject({ method: "GET", url: input.path, headers });
    assert.equal(accepted.statusCode, 200);
    const replayed = await server.inject({ method: "GET", url: input.path, headers });
    assert.equal(replayed.statusCode, 401);
  } finally {
    await app.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
    delete process.env.SERVICE_AUTH_KEY_FILE;
    delete process.env.TRUSTED_SERVICE_NAMES;
    delete process.env.CORS_ALLOWED_ORIGINS;
  }
});
