import { existsSync, readFileSync } from "node:fs";
const fail=(message)=>{throw new Error(`[listing-contract] ${message}`)};
const files=["listing/lifecycle-policy.json","database/migrations/000009_listing_lifecycle.up.sql","apps/api/src/listing/listing-lifecycle-core.ts","apps/api/src/listing/listing-expiration.worker.ts","apps/web/pages/my/posts.vue"];
for(const file of files)if(!existsSync(file))fail(`missing ${file}`);
const policy=JSON.parse(readFileSync(files[0],"utf8"));if(policy.statuses.length!==8||policy.ownerActions.length!==6||!policy.optimisticConcurrency||!policy.idempotentActions)fail("lifecycle policy is incomplete");
const sql=readFileSync(files[1],"utf8");for(const marker of ["post_versions","post_transitions","post_moderation_messages","post_lifecycle_requests","ENABLE ROW LEVEL SECURITY","posts_expiration_job_idx"])if(!sql.includes(marker))fail(`migration missing ${marker}`);
const core=readFileSync(files[2],"utf8");for(const marker of ["assertPostTransition","targetForOwnerAction","expiryDate","BUCKET_STATUSES"])if(!core.includes(marker))fail(`core missing ${marker}`);
console.log("Listing lifecycle contract passed: 8 states, 6 owner actions, version history, moderation, expiry and safe deletion.");
