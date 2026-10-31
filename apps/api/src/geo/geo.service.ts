import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { OutboxRepository } from "../database/database-core";
import type { PostgresUnitOfWork } from "../database/database-core";
import { UNIT_OF_WORK } from "../database/database.module";
import { geoChecksum, validateGeoImport } from "./geo-core";
import type { GeoImportDocument, PlaceType } from "./geo-core";
import { PLACE_TYPES } from "./geo-core";
import { GeoRepository } from "./geo.repository";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const keyPattern = /^[a-z][a-z0-9_-]{1,95}$/;

@Injectable()
export class GeoService {
  constructor(@Inject(UNIT_OF_WORK) private readonly unitOfWork: PostgresUnitOfWork) {}

  validate(document: GeoImportDocument) {
    const issues = validateGeoImport(document);
    const errors = issues.filter((issue) => issue.severity === "error");
    return { valid: errors.length === 0, checksum: geoChecksum(document), issues, counts: { errors: errors.length, warnings: issues.length - errors.length } };
  }

  async children(tenantId: string, parentKey?: string, type?: string) {
    this.requireUuid(tenantId, "tenantId");
    if (parentKey && !keyPattern.test(parentKey)) throw new BadRequestException("parentKey is invalid");
    if (type && !PLACE_TYPES.includes(type as PlaceType)) throw new BadRequestException("type is invalid");
    return this.withPublished(tenantId, (repository, releaseId) => repository.children(releaseId, parentKey, type));
  }

  async hierarchy(tenantId: string, provinceKey?: string) {
    this.requireUuid(tenantId, "tenantId");
    if (provinceKey && !keyPattern.test(provinceKey)) throw new BadRequestException("provinceKey is invalid");
    return this.withPublished(tenantId, (repository, releaseId) => repository.hierarchy(releaseId, provinceKey));
  }

  async place(tenantId: string, key: string) {
    this.requireUuid(tenantId, "tenantId");
    this.requireKey(key);
    return this.withPublished(tenantId, async (repository, releaseId) => {
      const place = await repository.place(releaseId, key);
      if (!place) throw new NotFoundException("place was not found");
      return place;
    });
  }

  async boundary(tenantId: string, key: string, precision: "full" | "simplified") {
    this.requireUuid(tenantId, "tenantId");
    this.requireKey(key);
    if (!(["full", "simplified"] as const).includes(precision)) throw new BadRequestException("precision is invalid");
    return this.withPublished(tenantId, async (repository, releaseId) => {
      const boundary = await repository.boundary(releaseId, key, precision);
      if (!boundary) throw new NotFoundException("place boundary was not found");
      return boundary;
    });
  }

  async search(tenantId: string, query: string, limit = 20) {
    this.requireUuid(tenantId, "tenantId");
    const normalized = query.trim();
    if (normalized.length < 2 || normalized.length > 80) throw new BadRequestException("query length must be between 2 and 80");
    const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 50) : 20;
    return this.withPublished(tenantId, (repository, releaseId) => repository.search(releaseId, normalized, safeLimit));
  }

  async resolvePoint(tenantId: string, longitude: number, latitude: number, type?: string) {
    this.requireUuid(tenantId, "tenantId");
    if (!Number.isFinite(longitude) || longitude < 44 || longitude > 64 || !Number.isFinite(latitude) || latitude < 24 || latitude > 40) {
      throw new BadRequestException("point is outside Iran bounds");
    }
    if (type && !PLACE_TYPES.includes(type as PlaceType)) throw new BadRequestException("type is invalid");
    return this.withPublished(tenantId, (repository, releaseId) => repository.resolvePoint(releaseId, longitude, latitude, type));
  }

  async importDraft(tenantId: string, document: GeoImportDocument, actorId?: string) {
    this.requireUuid(tenantId, "tenantId");
    if (actorId) this.requireUuid(actorId, "actorId");
    const validation = this.validate(document);
    if (!validation.valid) throw new BadRequestException({ code: "geo_import_invalid", issues: validation.issues });
    const releaseId = await this.unitOfWork.run({ tenantId, isolationLevel: "serializable", statementTimeoutMs: 120_000 }, async (client) => {
      const createdId = await new GeoRepository(client).createDraft(document, validation.checksum, actorId);
      await new OutboxRepository(client).enqueue({ aggregateType: "geo_release", aggregateId: createdId, eventType: "geo.release.imported", eventVersion: 1,
        payload: { releaseId: createdId, checksum: validation.checksum, state: "draft" } });
      return createdId;
    });
    return { releaseId, checksum: validation.checksum, state: "draft" as const, quality: validation.counts };
  }

  async publish(tenantId: string, releaseId: string) {
    this.requireUuid(tenantId, "tenantId");
    this.requireUuid(releaseId, "releaseId");
    await this.unitOfWork.run({ tenantId, isolationLevel: "serializable", statementTimeoutMs: 5_000 }, async (client) => {
      await new GeoRepository(client).publish(releaseId);
      await new OutboxRepository(client).enqueue({ aggregateType: "geo_release", aggregateId: releaseId, eventType: "geo.release.published", eventVersion: 1,
        payload: { releaseId, state: "published" } });
    });
    return { releaseId, state: "published" as const };
  }

  private async withPublished<Result>(tenantId: string, operation: (repository: GeoRepository, releaseId: string) => Promise<Result>) {
    return this.unitOfWork.run({ tenantId, statementTimeoutMs: 500 }, async (client) => {
      const repository = new GeoRepository(client);
      const release = await repository.publishedRelease();
      if (!release) throw new NotFoundException("published geo release was not found");
      return { release, data: await operation(repository, release.id) };
    });
  }

  private requireUuid(value: string, name: string): void {
    if (!uuidPattern.test(value)) throw new BadRequestException(`${name} must be a UUID`);
  }

  private requireKey(value: string): void {
    if (!keyPattern.test(value)) throw new BadRequestException("place key is invalid");
  }
}
