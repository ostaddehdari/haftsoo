import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const page=readFileSync(new URL("../pages/my/posts.vue",import.meta.url),"utf8");
const composable=readFileSync(new URL("../composables/useMyPosts.ts",import.meta.url),"utf8");
test("my posts exposes six lifecycle buckets and actionable cards",()=>{for(const marker of ["myPostBuckets","MyPostCard","PostHistoryPanel","/new"])assert.match(page,new RegExp(marker));for(const bucket of ["active","drafts","review","rejected","expired","archived"])assert.match(composable,new RegExp(`\\b${bucket}\\b`));});
test("owner actions use version and idempotency",()=>{for(const marker of ["expectedVersion","requestId","crypto.randomUUID","republish","archive"])assert.ok(composable.includes(marker));});
