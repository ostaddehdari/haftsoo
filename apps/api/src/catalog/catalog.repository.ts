import type { CatalogImportDocument } from "./catalog-core";
import type { SqlClient, SqlRow } from "../database/database-core";

export interface PublishedReleaseRow extends SqlRow {
  id: string;
  version: number;
  checksum: string;
  published_at: Date;
}

export class CatalogRepository {
  constructor(private readonly client: SqlClient) {}

  async publishedRelease(): Promise<PublishedReleaseRow | undefined> {
    const result = await this.client.query<PublishedReleaseRow>(
      `SELECT id, version, checksum, published_at
         FROM catalog.releases
        WHERE tenant_id = current_setting('app.current_tenant_id')::uuid AND state = 'published'
        LIMIT 1`
    );
    return result.rows[0];
  }

  async categoryTree(releaseId: string): Promise<SqlRow[]> {
    const result = await this.client.query(
      `SELECT external_key AS key, parent.external_key AS parent_key, category.slug::text,
              category.title, category.description, category.icon, category.search_keywords,
              category.sort_order, category.depth, category.metadata
         FROM catalog.categories category
         LEFT JOIN catalog.categories parent ON parent.id = category.parent_id
        WHERE category.release_id = $1::uuid AND category.is_active
        ORDER BY category.depth, category.sort_order, category.id`,
      [releaseId]
    );
    return result.rows;
  }

  async categoryForm(releaseId: string, slug: string): Promise<SqlRow[]> {
    const result = await this.client.query(
      `SELECT field.key, field.type, field.title, field.description, field.placeholder,
              field.validators, field.ui, field.is_filterable, field.is_searchable,
              assignment.section, assignment.position, assignment.required, assignment.overrides,
              COALESCE(options.items, '[]'::jsonb) AS options,
              COALESCE(rules.items, '[]'::jsonb) AS rules
         FROM catalog.categories category
         JOIN catalog.category_fields assignment ON assignment.category_id = category.id
         JOIN catalog.field_definitions field ON field.id = assignment.field_id
         LEFT JOIN LATERAL (
           SELECT jsonb_agg(jsonb_build_object('value', option.value, 'title', option.title, 'sortOrder', option.sort_order, 'metadata', option.metadata)
                            ORDER BY option.sort_order, option.id) AS items
             FROM catalog.field_options option WHERE option.field_id = field.id
         ) options ON true
         LEFT JOIN LATERAL (
           SELECT jsonb_agg(jsonb_build_object('dependsOn', dependency.key, 'operator', rule.operator, 'operand', rule.operand,
                                              'effect', rule.effect, 'priority', rule.priority)
                            ORDER BY rule.priority, rule.id) AS items
             FROM catalog.field_rules rule
             JOIN catalog.field_definitions dependency ON dependency.id = rule.depends_on_field_id
            WHERE rule.category_field_id = assignment.id
         ) rules ON true
        WHERE category.release_id = $1::uuid AND category.slug = $2::citext AND category.is_active
        ORDER BY assignment.section, assignment.position`,
      [releaseId, slug]
    );
    return result.rows;
  }

  async createDraft(document: CatalogImportDocument, checksum: string, sourceName: string, actorId?: string): Promise<string> {
    const versionResult = await this.client.query<{ version: number }>(
      `SELECT COALESCE(MAX(version), 0) + 1 AS version FROM catalog.releases
        WHERE tenant_id = current_setting('app.current_tenant_id')::uuid`
    );
    const version = Number(versionResult.rows[0]?.version ?? 1);
    const releaseResult = await this.client.query<{ id: string }>(
      `INSERT INTO catalog.releases (tenant_id, version, checksum, source_metadata, created_by)
       VALUES (current_setting('app.current_tenant_id')::uuid, $1, $2, $3::jsonb, $4::uuid)
       RETURNING id`,
      [version, checksum, JSON.stringify(document.source), actorId ?? null]
    );
    const releaseId = releaseResult.rows[0]?.id;
    if (!releaseId) throw new Error("catalog release insert returned no id");

    const categoryIds = new Map<string, string>();
    const pending = [...document.categories];
    while (pending.length) {
      const readyIndex = pending.findIndex((category) => !category.parentKey || categoryIds.has(category.parentKey));
      if (readyIndex < 0) throw new Error("category hierarchy cannot be ordered");
      const [category] = pending.splice(readyIndex, 1);
      const result = await this.client.query<{ id: string }>(
        `INSERT INTO catalog.categories
           (tenant_id, release_id, external_key, parent_id, slug, title, description, icon, search_keywords, sort_order, metadata)
         VALUES (current_setting('app.current_tenant_id')::uuid, $1::uuid, $2, $3::uuid, $4, $5, $6, $7::jsonb, $8::text[], $9, $10::jsonb)
         RETURNING id`,
        [releaseId, category.key, category.parentKey ? categoryIds.get(category.parentKey) : null, category.slug,
          category.title, category.description ?? "", JSON.stringify(category.icon ?? {}), category.searchKeywords ?? [],
          category.sortOrder ?? 0, JSON.stringify(category.metadata ?? {})]
      );
      const id = result.rows[0]?.id;
      if (!id) throw new Error("category insert returned no id");
      categoryIds.set(category.key, id);
    }

    const fieldIds = new Map<string, string>();
    for (const field of document.fields) {
      const result = await this.client.query<{ id: string }>(
        `INSERT INTO catalog.field_definitions
           (tenant_id, release_id, key, type, title, description, placeholder, validators, ui, is_filterable, is_searchable)
         VALUES (current_setting('app.current_tenant_id')::uuid, $1::uuid, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)
         RETURNING id`,
        [releaseId, field.key, field.type, field.title, field.description ?? "", field.placeholder ?? "",
          JSON.stringify(field.validators ?? {}), JSON.stringify(field.ui ?? {}), field.filterable ?? false, field.searchable ?? false]
      );
      const fieldId = result.rows[0]?.id;
      if (!fieldId) throw new Error("field insert returned no id");
      fieldIds.set(field.key, fieldId);
      for (const option of field.options ?? []) {
        await this.client.query(
          `INSERT INTO catalog.field_options (tenant_id, field_id, value, title, sort_order, metadata)
           VALUES (current_setting('app.current_tenant_id')::uuid, $1::uuid, $2, $3, $4, $5::jsonb)`,
          [fieldId, option.value, option.title, option.sortOrder ?? 0, JSON.stringify(option.metadata ?? {})]
        );
      }
    }

    for (const form of document.forms) {
      const categoryId = categoryIds.get(form.categoryKey);
      if (!categoryId) throw new Error(`unknown category ${form.categoryKey}`);
      for (const assignment of form.fields) {
        const fieldId = fieldIds.get(assignment.fieldKey);
        if (!fieldId) throw new Error(`unknown field ${assignment.fieldKey}`);
        const assignmentResult = await this.client.query<{ id: string }>(
          `INSERT INTO catalog.category_fields
             (tenant_id, category_id, field_id, section, position, required, overrides)
           VALUES (current_setting('app.current_tenant_id')::uuid, $1::uuid, $2::uuid, $3, $4, $5, $6::jsonb)
           RETURNING id`,
          [categoryId, fieldId, assignment.section ?? "main", assignment.position, assignment.required ?? false,
            JSON.stringify(assignment.overrides ?? {})]
        );
        const categoryFieldId = assignmentResult.rows[0]?.id;
        if (!categoryFieldId) throw new Error("category field insert returned no id");
        for (const rule of assignment.rules ?? []) {
          await this.client.query(
            `INSERT INTO catalog.field_rules
               (tenant_id, category_field_id, depends_on_field_id, operator, operand, effect, priority)
             VALUES (current_setting('app.current_tenant_id')::uuid, $1::uuid, $2::uuid, $3, $4::jsonb, $5, $6)`,
            [categoryFieldId, fieldIds.get(rule.dependsOn), rule.operator, JSON.stringify(rule.operand ?? null), rule.effect, rule.priority ?? 0]
          );
        }
      }
    }

    await this.client.query(
      `INSERT INTO catalog.import_jobs (tenant_id, release_id, checksum, source_name, status, counts, created_by, finished_at)
       VALUES (current_setting('app.current_tenant_id')::uuid, $1::uuid, $2, $3, 'imported', $4::jsonb, $5::uuid, clock_timestamp())`,
      [releaseId, checksum, sourceName, JSON.stringify({ categories: document.categories.length, fields: document.fields.length, forms: document.forms.length }), actorId ?? null]
    );
    return releaseId;
  }

  async publish(releaseId: string): Promise<void> {
    await this.client.query(
      `UPDATE catalog.releases SET state = 'retired', retired_at = clock_timestamp()
        WHERE tenant_id = current_setting('app.current_tenant_id')::uuid AND state = 'published'`
    );
    const result = await this.client.query(
      `UPDATE catalog.releases SET state = 'published', published_at = clock_timestamp()
        WHERE id = $1::uuid AND tenant_id = current_setting('app.current_tenant_id')::uuid AND state = 'draft'`,
      [releaseId]
    );
    if (result.rowCount !== 1) throw new Error("draft catalog release was not found");
  }
}
