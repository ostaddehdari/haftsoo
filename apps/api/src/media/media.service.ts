import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { OutboxRepository, type PostgresUnitOfWork } from "../database/database-core";
import { UNIT_OF_WORK } from "../database/database.module";
import { derivativePlan, MEDIA_POLICY, presignPut, safeObjectKey, validateMediaInput, type InitiateMediaInput } from "./media-core";
import { MediaRepository } from "./media.repository";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function secret(value: string | undefined, path: string | undefined, fallback: string) { const resolved = value ?? (path && existsSync(path) ? readFileSync(path, "utf8").trim() : undefined); if (!resolved && process.env.NODE_ENV === "production") throw new Error("object storage credentials are missing"); return resolved ?? fallback; }

@Injectable()
export class MediaService {
  constructor(@Inject(UNIT_OF_WORK) private readonly unitOfWork: PostgresUnitOfWork) {}
  async initiate(tenantId: string, actorId: string, input: InitiateMediaInput) {
    this.ids(tenantId, actorId, input.draftId, input.clientId); const issues = validateMediaInput(input); if (issues.length) throw new BadRequestException({ code: "media_invalid", issues });
    return this.unitOfWork.run({ tenantId, isolationLevel: "serializable" }, async (client) => {
      const repository = new MediaRepository(client); if (await repository.count(input.draftId, actorId) >= MEDIA_POLICY.maxItems) throw new ConflictException("media_limit_reached");
      const id = randomUUID(); const key = safeObjectKey(tenantId, actorId, id, input.contentType); const asset = await repository.create(id, actorId, input, key);
      const upload = presignPut({ endpoint: process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT ?? "http://127.0.0.1:9000", region: process.env.S3_REGION ?? "us-east-1", bucket: process.env.S3_BUCKET ?? "haftsoo-media", accessKey: secret(process.env.S3_ACCESS_KEY, process.env.S3_ACCESS_KEY_FILE, "haftsoo-local"), secretKey: secret(process.env.S3_SECRET_KEY, process.env.S3_SECRET_KEY_FILE, "haftsoo-local-secret"), key, contentType: input.contentType, checksum: input.sha256, expires: MEDIA_POLICY.uploadTtlSeconds });
      return { asset, upload };
    });
  }
  async complete(tenantId: string, actorId: string, id: string, input: { etag: string }) {
    this.ids(tenantId, actorId, id); if (!/^[\w"-]{1,128}$/.test(input.etag ?? "")) throw new BadRequestException("etag_invalid");
    return this.unitOfWork.run({ tenantId, isolationLevel: "serializable" }, async (client) => {
      const repository = new MediaRepository(client); const current = await repository.find(id, actorId, true); if (!current) throw new NotFoundException("media_not_found");
      const asset = await repository.uploaded(id, input.etag); if (!asset) throw new ConflictException("media_state_conflict");
      await new OutboxRepository(client).enqueue({ aggregateType: "media", aggregateId: id, eventType: "media.uploaded", eventVersion: 1, payload: { assetId: id, objectKey: asset.objectKey, kind: asset.kind, sha256: asset.sha256, derivatives: derivativePlan(asset.kind), stripExif: true, malwareScan: true, aiSafety: true, duplicateWindow: "1 day" } }); return asset;
    });
  }
  async list(tenantId: string, actorId: string, draftId: string) { this.ids(tenantId, actorId, draftId); return this.unitOfWork.run({ tenantId }, (client) => new MediaRepository(client).list(draftId, actorId)); }
  async reorder(tenantId: string, actorId: string, draftId: string, input: { orderedIds: string[]; coverId: string }) { this.ids(tenantId, actorId, draftId, input.coverId, ...input.orderedIds); if (new Set(input.orderedIds).size !== input.orderedIds.length || !input.orderedIds.includes(input.coverId)) throw new BadRequestException("media_order_invalid"); return this.unitOfWork.run({ tenantId, isolationLevel: "serializable" }, (client) => new MediaRepository(client).reorder(draftId, actorId, input.orderedIds, input.coverId)); }
  async remove(tenantId: string, actorId: string, id: string) { this.ids(tenantId, actorId, id); return this.unitOfWork.run({ tenantId }, async (client) => { await new MediaRepository(client).remove(id, actorId); return { deleted: true }; }); }
  private ids(...values: string[]) { if (values.some((value) => !UUID.test(value))) throw new BadRequestException("identifiers must be UUIDs"); }
}
