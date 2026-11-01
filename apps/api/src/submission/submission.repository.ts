import type { SqlClient, SqlRow } from "../database/database-core";
import type { SubmissionDraft, SubmissionDraftPayload, SubmissionStep } from "./submission-core";

interface DraftRow extends SqlRow { id: string; status: "draft" | "ready" | "submitted"; current_step: SubmissionStep; revision: number; payload: SubmissionDraftPayload; updated_at: Date }

export class SubmissionRepository {
  constructor(private readonly client: SqlClient) {}

  async create(id: string, actorId: string): Promise<SubmissionDraft> {
    const result = await this.client.query<DraftRow>(
      `INSERT INTO listing.submission_drafts (id, tenant_id, actor_id)
       VALUES ($1::uuid, current_setting('app.current_tenant_id')::uuid, $2::uuid)
       RETURNING id, status, current_step, revision, payload, updated_at`, [id, actorId]
    );
    return this.map(result.rows[0]);
  }

  async find(id: string, actorId: string, forUpdate = false): Promise<SubmissionDraft | undefined> {
    const result = await this.client.query<DraftRow>(
      `SELECT id, status, current_step, revision, payload, updated_at FROM listing.submission_drafts
       WHERE id = $1::uuid AND actor_id = $2::uuid AND tenant_id = current_setting('app.current_tenant_id')::uuid${forUpdate ? " FOR UPDATE" : ""}`,
      [id, actorId]
    );
    return result.rows[0] ? this.map(result.rows[0]) : undefined;
  }

  async save(id: string, actorId: string, revision: number, step: SubmissionStep, payload: SubmissionDraftPayload, checksum: string): Promise<SubmissionDraft | undefined> {
    const result = await this.client.query<DraftRow>(
      `UPDATE listing.submission_drafts SET current_step = $4, payload = $5::jsonb, payload_checksum = $6,
              revision = revision + 1, autosaved_at = clock_timestamp(), updated_at = clock_timestamp()
       WHERE id = $1::uuid AND actor_id = $2::uuid AND tenant_id = current_setting('app.current_tenant_id')::uuid
         AND revision = $3 AND status IN ('draft','ready')
       RETURNING id, status, current_step, revision, payload, updated_at`,
      [id, actorId, revision, step, JSON.stringify(payload), checksum]
    );
    return result.rows[0] ? this.map(result.rows[0]) : undefined;
  }

  async submit(id: string, actorId: string, idempotencyKey: string, checksum: string): Promise<{ postId: string; replayed: boolean }> {
    const existing = await this.client.query<{ post_id: string; draft_id: string; payload_checksum: string }>(
      `SELECT post_id, draft_id, payload_checksum FROM listing.submission_requests WHERE tenant_id = current_setting('app.current_tenant_id')::uuid AND actor_id = $1::uuid AND idempotency_key = $2`,
      [actorId, idempotencyKey]
    );
    if (existing.rows[0]) {
      if (existing.rows[0].draft_id !== id || existing.rows[0].payload_checksum !== checksum) throw new Error("idempotency_conflict");
      return { postId: existing.rows[0].post_id, replayed: true };
    }
    const post = await this.client.query<{ id: string }>(
      `INSERT INTO listing.posts (tenant_id, owner_id, submission_draft_id, status, title, category_slug, city_key, neighborhood_keys, attributes, description, contact, privacy)
       SELECT tenant_id, actor_id, id, 'pending_review', payload->'fields'->>'title', payload->'category'->>'slug', payload->'location'->>'cityKey',
              ARRAY(SELECT jsonb_array_elements_text(COALESCE(payload->'location'->'neighborhoodKeys','[]'::jsonb))), COALESCE(payload->'fields','{}'::jsonb),
              payload->>'description', COALESCE(payload->'contact','{}'::jsonb), COALESCE(payload->'privacy','{}'::jsonb)
         FROM listing.submission_drafts WHERE id = $1::uuid AND actor_id = $2::uuid
       RETURNING id`, [id, actorId]
    );
    const postId = post.rows[0]?.id;
    if (!postId) throw new Error("submission draft was not found");
    await this.client.query(
      `INSERT INTO listing.submission_requests (tenant_id, actor_id, draft_id, idempotency_key, payload_checksum, post_id)
       VALUES (current_setting('app.current_tenant_id')::uuid, $1::uuid, $2::uuid, $3, $4, $5::uuid)`, [actorId, id, idempotencyKey, checksum, postId]
    );
    await this.client.query(
      `INSERT INTO listing.post_versions (tenant_id, post_id, version, snapshot, change_kind)
       SELECT tenant_id, id, version, jsonb_build_object('status',status,'title',title,'description',description,'attributes',attributes,'contact',contact,'privacy',privacy), 'submitted'
       FROM listing.posts WHERE id = $1::uuid ON CONFLICT (post_id, version) DO NOTHING`, [postId]
    );
    await this.client.query(`UPDATE listing.submission_drafts SET status = 'submitted', submitted_at = clock_timestamp(), updated_at = clock_timestamp() WHERE id = $1::uuid`, [id]);
    return { postId, replayed: false };
  }

  async mediaReadiness(id: string, actorId: string): Promise<{ total: number; pending: number }> {
    const result = await this.client.query<{ total: string; pending: string }>(
      `SELECT count(*)::text AS total, count(*) FILTER (WHERE status <> 'ready')::text AS pending
       FROM media.assets WHERE draft_id = $1::uuid AND owner_id = $2::uuid AND status <> 'deleted'`, [id, actorId]
    );
    return { total: Number(result.rows[0]?.total ?? 0), pending: Number(result.rows[0]?.pending ?? 0) };
  }

  private map(row: DraftRow | undefined): SubmissionDraft {
    if (!row) throw new Error("submission draft insert returned no row");
    return { id: row.id, status: row.status, currentStep: row.current_step, revision: Number(row.revision), payload: row.payload, updatedAt: row.updated_at.toISOString() };
  }
}
