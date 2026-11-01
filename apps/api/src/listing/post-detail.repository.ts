import type { SqlClient, SqlRow } from "../database/database-core";

export interface PublicPostRow extends SqlRow {
  id:string; public_token:string; slug:string; status:string; title:string; description:string; category_slug:string; city_key:string;
  neighborhood_keys:string[]; attributes:Record<string,unknown>; contact:Record<string,unknown>; privacy:Record<string,unknown>;
  seller_profile:Record<string,unknown>; latitude:number|null; longitude:number|null; location_precision_m:number;
  media:Array<{id:string;kind:"image"|"video";url:string;position:number;cover:boolean}>; published_at:Date|null; expires_at:Date|null;
}

export class PostDetailRepository {
  constructor(private readonly client: SqlClient) {}

  async find(token:string) {
    const result=await this.client.query<PublicPostRow>(`SELECT p.id,p.public_token,p.slug,p.status,p.title,p.description,p.category_slug,p.city_key,p.neighborhood_keys,p.attributes,p.contact,p.privacy,p.seller_profile,
      CASE WHEN p.location IS NULL THEN NULL ELSE ST_Y(p.location::geometry) END AS latitude,
      CASE WHEN p.location IS NULL THEN NULL ELSE ST_X(p.location::geometry) END AS longitude,p.location_precision_m,p.published_at,p.expires_at,
      COALESCE(jsonb_agg(jsonb_build_object('id',a.id,'kind',a.kind,'url',a.public_url,'position',a.position,'cover',a.is_cover) ORDER BY a.position) FILTER (WHERE a.id IS NOT NULL AND a.status='ready' AND a.public_url IS NOT NULL),'[]'::jsonb) AS media
      FROM listing.posts p LEFT JOIN media.assets a ON a.post_id=p.id
      WHERE p.public_token=$1 AND p.status IN ('published','expired') GROUP BY p.id`,[token]);
    return result.rows[0];
  }

  async contactReplay(postId:string,actorId:string,requestId:string){const result=await this.client.query<{phone:string}>(`SELECT revealed_phone AS phone FROM listing.post_contact_reveals WHERE post_id=$1::uuid AND actor_id=$2::uuid AND request_id=$3`,[postId,actorId,requestId]);return result.rows[0];}
  async logContact(postId:string,actorId:string,requestId:string,phone:string){await this.client.query(`INSERT INTO listing.post_contact_reveals(tenant_id,post_id,actor_id,request_id,revealed_phone) SELECT tenant_id,id,$2::uuid,$3,$4 FROM listing.posts WHERE id=$1::uuid ON CONFLICT(tenant_id,actor_id,request_id) DO NOTHING`,[postId,actorId,requestId,phone]);await this.logAction(postId,actorId,"contact_reveal",{requestId});}
  async bookmark(postId:string,actorId:string,active:boolean){if(active)await this.client.query(`INSERT INTO listing.post_bookmarks(tenant_id,actor_id,post_id) SELECT tenant_id,$2::uuid,id FROM listing.posts WHERE id=$1::uuid ON CONFLICT DO NOTHING`,[postId,actorId]);else await this.client.query(`DELETE FROM listing.post_bookmarks WHERE post_id=$1::uuid AND actor_id=$2::uuid`,[postId,actorId]);await this.logAction(postId,actorId,active?"bookmark_add":"bookmark_remove",{});return{bookmarked:active};}
  async note(postId:string,actorId:string,note:string){if(note)await this.client.query(`INSERT INTO listing.post_notes(tenant_id,actor_id,post_id,note) SELECT tenant_id,$2::uuid,id,$3 FROM listing.posts WHERE id=$1::uuid ON CONFLICT(tenant_id,actor_id,post_id) DO UPDATE SET note=EXCLUDED.note,updated_at=clock_timestamp()`,[postId,actorId,note]);else await this.client.query(`DELETE FROM listing.post_notes WHERE post_id=$1::uuid AND actor_id=$2::uuid`,[postId,actorId]);await this.logAction(postId,actorId,"private_note",{length:note.length});return{note};}
  async report(postId:string,actorId:string|null,reason:string,description:string){const result=await this.client.query<{id:string}>(`INSERT INTO moderation.post_reports(tenant_id,post_id,actor_id,reason,description) SELECT tenant_id,id,$2::uuid,$3,$4 FROM listing.posts WHERE id=$1::uuid RETURNING id`,[postId,actorId,reason,description]);await this.logAction(postId,actorId,"report_submit",{reason});return{id:result.rows[0]?.id,status:"received" as const};}
  async logAction(postId:string,actorId:string|null,action:string,payload:Record<string,unknown>){await this.client.query(`INSERT INTO audit.post_actions(tenant_id,post_id,actor_id,action,payload) SELECT tenant_id,id,$2::uuid,$3,$4::jsonb FROM listing.posts WHERE id=$1::uuid`,[postId,actorId,action,JSON.stringify(payload)]);}
}
