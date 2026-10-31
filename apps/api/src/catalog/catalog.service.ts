import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK } from "../database/database.module";
import type { PostgresUnitOfWork } from "../database/database-core";
import { OutboxRepository } from "../database/database-core";
import { buildCategoryTree, catalogChecksum, validateCatalogImport } from "./catalog-core";
import type { CatalogImportDocument } from "./catalog-core";
import { CatalogRepository } from "./catalog.repository";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class CatalogService {
  constructor(@Inject(UNIT_OF_WORK) private readonly unitOfWork: PostgresUnitOfWork) {}

  validate(document: CatalogImportDocument) {
    const issues = validateCatalogImport(document);
    return { valid: issues.length === 0, checksum: catalogChecksum(document), issues };
  }

  async tree(tenantId: string) {
    this.requireUuid(tenantId, "tenantId");
    return this.unitOfWork.run({ tenantId, statementTimeoutMs: 500 }, async (client) => {
      const repository = new CatalogRepository(client);
      const release = await repository.publishedRelease();
      if (!release) throw new NotFoundException("published catalog release was not found");
      const rows = await repository.categoryTree(release.id);
      const categories = rows.map((row) => ({
        key: String(row.key), parentKey: row.parent_key ? String(row.parent_key) : undefined,
        slug: String(row.slug), title: String(row.title), description: String(row.description),
        icon: row.icon as Record<string, unknown>, searchKeywords: row.search_keywords as string[],
        sortOrder: Number(row.sort_order), metadata: row.metadata as Record<string, unknown>
      }));
      return { release, categories: buildCategoryTree(categories) };
    });
  }

  async form(tenantId: string, slug: string) {
    this.requireUuid(tenantId, "tenantId");
    if (!/^[a-z0-9][a-z0-9-]{0,95}$/.test(slug)) throw new BadRequestException("slug is invalid");
    return this.unitOfWork.run({ tenantId, statementTimeoutMs: 500 }, async (client) => {
      const repository = new CatalogRepository(client);
      const release = await repository.publishedRelease();
      if (!release) throw new NotFoundException("published catalog release was not found");
      const fields = await repository.categoryForm(release.id, slug);
      if (!fields.length) throw new NotFoundException("category form was not found");
      return { release, slug, fields };
    });
  }

  async importDraft(tenantId: string, document: CatalogImportDocument, actorId?: string) {
    this.requireUuid(tenantId, "tenantId");
    if (actorId) this.requireUuid(actorId, "actorId");
    const validation = this.validate(document);
    if (!validation.valid) throw new BadRequestException({ code: "catalog_invalid", issues: validation.issues });
    const releaseId = await this.unitOfWork.run({ tenantId, isolationLevel: "serializable", statementTimeoutMs: 10_000 }, async (client) => {
      const createdId = await new CatalogRepository(client).createDraft(document, validation.checksum, document.source.name, actorId);
      await new OutboxRepository(client).enqueue({
        aggregateType: "catalog_release", aggregateId: createdId, eventType: "catalog.release.imported", eventVersion: 1,
        payload: { releaseId: createdId, checksum: validation.checksum, state: "draft" }
      });
      return createdId;
    });
    return { releaseId, checksum: validation.checksum, state: "draft" as const };
  }

  async publish(tenantId: string, releaseId: string) {
    this.requireUuid(tenantId, "tenantId");
    this.requireUuid(releaseId, "releaseId");
    await this.unitOfWork.run({ tenantId, isolationLevel: "serializable", statementTimeoutMs: 5_000 }, async (client) => {
      await new CatalogRepository(client).publish(releaseId);
      await new OutboxRepository(client).enqueue({
        aggregateType: "catalog_release", aggregateId: releaseId, eventType: "catalog.release.published", eventVersion: 1,
        payload: { releaseId, state: "published" }
      });
    });
    return { releaseId, state: "published" as const };
  }

  private requireUuid(value: string, name: string): void {
    if (!uuidPattern.test(value)) throw new BadRequestException(`${name} must be a UUID`);
  }
}
