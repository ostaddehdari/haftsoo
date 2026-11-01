import type { SqlClient, SqlRow } from "../database/database-core";
import type { InitiateMediaInput, MediaStatus } from "./media-core";

interface AssetRow extends SqlRow { id: string; draft_id: string; client_id: string; kind: "image" | "video"; file_name: string; content_type: string; byte_size: number; sha256: string; object_key: string; status: MediaStatus; position: number; is_cover: boolean; public_url: string | null; rejection_code: string | null; created_at: Date }
export class MediaRepository {
  constructor(private readonly client: SqlClient) {}
  async count(draftId: string, actorId: string) { const result = await this.client.query<{ count: string }>(`SELECT count(*)::text AS count FROM media.assets WHERE draft_id=$1::uuid AND owner_id=$2::uuid AND status <> 'deleted'`, [draftId, actorId]); return Number(result.rows[0]?.count ?? 0); }
  async create(id: string, actorId: string, input: InitiateMediaInput, objectKey: string) {
    const result = await this.client.query<AssetRow>(`INSERT INTO media.assets (id,tenant_id,owner_id,draft_id,client_id,kind,file_name,content_type,byte_size,sha256,object_key,position)
      VALUES ($1::uuid,current_setting('app.current_tenant_id')::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8,$9,$10,(SELECT count(*) FROM media.assets WHERE draft_id=$3::uuid AND status <> 'deleted'))
      ON CONFLICT (tenant_id,draft_id,client_id) DO UPDATE SET updated_at=clock_timestamp() RETURNING *`, [id, actorId, input.draftId, input.clientId, input.kind, input.fileName, input.contentType, input.size, input.sha256.toLowerCase(), objectKey]);
    return this.map(result.rows[0]);
  }
  async find(id: string, actorId: string, lock=false) { const result = await this.client.query<AssetRow>(`SELECT * FROM media.assets WHERE id=$1::uuid AND owner_id=$2::uuid${lock ? " FOR UPDATE" : ""}`, [id, actorId]); return result.rows[0] ? this.map(result.rows[0]) : undefined; }
  async list(draftId: string, actorId: string) { const result = await this.client.query<AssetRow>(`SELECT * FROM media.assets WHERE draft_id=$1::uuid AND owner_id=$2::uuid AND status <> 'deleted' ORDER BY position,id`, [draftId, actorId]); return result.rows.map((row) => this.map(row)); }
  async uploaded(id: string, etag: string) { const result = await this.client.query<AssetRow>(`UPDATE media.assets SET status='scanning',storage_etag=$2,uploaded_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=$1::uuid AND status IN ('initiated','uploaded') RETURNING *`, [id, etag]); return result.rows[0] ? this.map(result.rows[0]) : undefined; }
  async reorder(draftId: string, actorId: string, orderedIds: string[], coverId: string) { await this.client.query(`UPDATE media.assets a SET position=v.position,is_cover=(a.id=$4::uuid),updated_at=clock_timestamp() FROM unnest($3::uuid[]) WITH ORDINALITY v(id,position) WHERE a.id=v.id AND a.draft_id=$1::uuid AND a.owner_id=$2::uuid`, [draftId, actorId, orderedIds, coverId]); return this.list(draftId, actorId); }
  async remove(id: string, actorId: string) { await this.client.query(`UPDATE media.assets SET status='deleted',is_cover=false,deleted_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=$1::uuid AND owner_id=$2::uuid`, [id, actorId]); }
  private map(row: AssetRow) { return { id: row.id, draftId: row.draft_id, clientId: row.client_id, kind: row.kind, name: row.file_name, contentType: row.content_type, size: Number(row.byte_size), sha256: row.sha256, objectKey: row.object_key, status: row.status, position: Number(row.position), cover: row.is_cover, url: row.public_url, rejectionCode: row.rejection_code, createdAt: row.created_at.toISOString() }; }
}
