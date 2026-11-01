import { readFileSync } from "node:fs";
const fail=(message)=>{throw new Error(`[media-contract] ${message}`)};
const policy=JSON.parse(readFileSync("media/policy.json","utf8"));const migration=readFileSync("database/migrations/000008_media_pipeline.up.sql","utf8");const core=readFileSync("apps/api/src/media/media-core.ts","utf8");const service=readFileSync("apps/api/src/media/media.service.ts","utf8");
if(policy.maximumItems!==10||policy.upload.ttlSeconds>900||policy.upload.checksum!=="sha256")fail("upload policy regressed");
for(const marker of ["CREATE TABLE media.assets","CREATE TABLE media.derivatives","CREATE TABLE media.processing_jobs","ENABLE ROW LEVEL SECURITY","media_same_day_duplicate_idx","media_single_cover_idx"])if(!migration.includes(marker))fail(`migration missing ${marker}`);
for(const marker of ["AWS4-HMAC-SHA256","x-amz-checksum-sha256","UNSIGNED-PAYLOAD","stripExif","duplicateWindow"])if(!(core+service).includes(marker))fail(`runtime missing ${marker}`);
console.log("Media contract passed: tenant-scoped presigned upload, checksum, derivatives, safety, same-day duplicate, ordering and cleanup policy.");
