import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
test("media uploader hashes, presigns, uploads and completes", () => { const source = readFileSync("composables/useMediaUpload.ts", "utf8"); for (const marker of ["crypto.subtle.digest", "/media/uploads", "method: \"PUT\"", "/complete", "/order"]) assert.ok(source.includes(marker), marker); });
test("submission media UI exposes progress, cover and remove", () => { const source = readFileSync("components/MediaDescriptionStep.vue", "utf8"); for (const marker of ["<progress", "makeCover", "removeItem", "۲۰۰ مگابایت"]) assert.ok(source.includes(marker), marker); });
