import type { SqlClient, SqlRow } from "../database/database-core";
import { BUCKET_STATUSES, type MyPostsBucket, type PostStatus } from "./listing-lifecycle-core";

export interface PostRow extends SqlRow { id:string; status:PostStatus; title:string; category_slug:string; city_key:string; version:number; moderation_reason_code:string|null; moderation_message:string|null; published_at:Date|null; expires_at:Date|null; updated_at:Date; created_at:Date }
interface DraftRow extends SqlRow { id:string; current_step:string; revision:number; payload:Record<string,unknown>; updated_at:Date }

export class ListingRepository {
  constructor(private readonly client: SqlClient) {}

  async list(ownerId:string, bucket:MyPostsBucket, limit:number, cursor?:string) {
    if (bucket === "drafts") {
      const result = await this.client.query<DraftRow>(`SELECT id,current_step,revision,payload,updated_at FROM listing.submission_drafts WHERE actor_id=$1::uuid AND status IN ('draft','ready') AND ($2::timestamptz IS NULL OR updated_at<$2::timestamptz) ORDER BY updated_at DESC,id DESC LIMIT $3`,[ownerId,cursor??null,limit+1]);
      const rows=result.rows.slice(0,limit);return{items:rows.map(row=>({id:row.id,kind:"draft" as const,status:"draft" as const,title:String((row.payload.fields as Record<string,unknown>|undefined)?.title??"پیش‌نویس بدون عنوان"),currentStep:row.current_step,version:Number(row.revision),updatedAt:row.updated_at.toISOString()})),nextCursor:result.rows.length>limit?rows.at(-1)?.updated_at.toISOString():undefined};
    }
    const statuses=BUCKET_STATUSES[bucket];
    const result=await this.client.query<PostRow>(`SELECT id,status,title,category_slug,city_key,version,moderation_reason_code,moderation_message,published_at,expires_at,updated_at,created_at FROM listing.posts WHERE owner_id=$1::uuid AND status=ANY($2::text[]) AND ($3::timestamptz IS NULL OR updated_at<$3::timestamptz) ORDER BY updated_at DESC,id DESC LIMIT $4`,[ownerId,statuses,cursor??null,limit+1]);
    const rows=result.rows.slice(0,limit);return{items:rows.map(row=>this.map(row)),nextCursor:result.rows.length>limit?rows.at(-1)?.updated_at.toISOString():undefined};
  }

  async find(id:string,ownerId:string,lock=false){const result=await this.client.query<PostRow>(`SELECT id,status,title,category_slug,city_key,version,moderation_reason_code,moderation_message,published_at,expires_at,updated_at,created_at FROM listing.posts WHERE id=$1::uuid AND owner_id=$2::uuid${lock?" FOR UPDATE":""}`,[id,ownerId]);return result.rows[0];}
  async lifecycleReplay(id:string,ownerId:string,requestId:string){const result=await this.client.query<{post_id:string}>(`SELECT post_id FROM listing.post_lifecycle_requests WHERE tenant_id=current_setting('app.current_tenant_id')::uuid AND owner_id=$1::uuid AND post_id=$2::uuid AND request_id=$3`,[ownerId,id,requestId]);return Boolean(result.rows[0]);}
  async history(id:string,ownerId:string){const result=await this.client.query(`SELECT v.version,v.snapshot,v.change_kind,v.created_at FROM listing.post_versions v JOIN listing.posts p ON p.id=v.post_id WHERE v.post_id=$1::uuid AND p.owner_id=$2::uuid ORDER BY v.version DESC`,[id,ownerId]);return result.rows.map((row)=>({version:Number(row.version),snapshot:row.snapshot,changeKind:row.change_kind,createdAt:(row.created_at as Date).toISOString()}));}
  async moderation(id:string,ownerId:string){const result=await this.client.query(`SELECT m.status,m.reason_code,m.message,m.created_at FROM listing.post_moderation_messages m JOIN listing.posts p ON p.id=m.post_id WHERE m.post_id=$1::uuid AND p.owner_id=$2::uuid ORDER BY m.created_at DESC`,[id,ownerId]);return result.rows.map((row)=>({status:row.status,reasonCode:row.reason_code,message:row.message,createdAt:(row.created_at as Date).toISOString()}));}

  async edit(id:string,ownerId:string,expectedVersion:number,patch:Record<string,unknown>,targetStatus:PostStatus){
    const result=await this.client.query<PostRow>(`UPDATE listing.posts SET title=COALESCE($4,title),description=COALESCE($5,description),attributes=COALESCE($6::jsonb,attributes),contact=COALESCE($7::jsonb,contact),privacy=COALESCE($8::jsonb,privacy),status=$9,version=version+1,updated_at=clock_timestamp() WHERE id=$1::uuid AND owner_id=$2::uuid AND version=$3 RETURNING id,status,title,category_slug,city_key,version,moderation_reason_code,moderation_message,published_at,expires_at,updated_at,created_at`,[id,ownerId,expectedVersion,patch.title??null,patch.description??null,patch.attributes?JSON.stringify(patch.attributes):null,patch.contact?JSON.stringify(patch.contact):null,patch.privacy?JSON.stringify(patch.privacy):null,targetStatus]);
    return result.rows[0];
  }

  async transition(id:string,ownerId:string,expectedVersion:number,to:PostStatus,action:string,expiresAt:Date|null,requestId:string){
    const result=await this.client.query<PostRow>(`UPDATE listing.posts SET status=$4,version=version+1,expires_at=CASE WHEN $5::timestamptz IS NULL THEN expires_at ELSE $5::timestamptz END,published_at=CASE WHEN $4='published' THEN COALESCE(published_at,clock_timestamp()) ELSE published_at END,archived_at=CASE WHEN $4='archived' THEN clock_timestamp() ELSE archived_at END,deleted_at=CASE WHEN $4='deleted' THEN clock_timestamp() ELSE deleted_at END,updated_at=clock_timestamp() WHERE id=$1::uuid AND owner_id=$2::uuid AND version=$3 RETURNING id,status,title,category_slug,city_key,version,moderation_reason_code,moderation_message,published_at,expires_at,updated_at,created_at`,[id,ownerId,expectedVersion,to,expiresAt]);
    if(result.rows[0])await this.client.query(`INSERT INTO listing.post_lifecycle_requests(tenant_id,owner_id,post_id,request_id,action) VALUES(current_setting('app.current_tenant_id')::uuid,$1::uuid,$2::uuid,$3,$4)`,[ownerId,id,requestId,action]);return{row:result.rows[0]};
  }

  async snapshot(postId:string,version:number,kind:string){await this.client.query(`INSERT INTO listing.post_versions(tenant_id,post_id,version,snapshot,change_kind) SELECT tenant_id,id,$2,jsonb_build_object('status',status,'title',title,'description',description,'attributes',attributes,'contact',contact,'privacy',privacy),$3 FROM listing.posts WHERE id=$1::uuid ON CONFLICT(post_id,version) DO NOTHING`,[postId,version,kind]);}
  async logTransition(postId:string,from:PostStatus,to:PostStatus,actorId:string,actorType:string,reason?:string){await this.client.query(`INSERT INTO listing.post_transitions(tenant_id,post_id,from_status,to_status,actor_id,actor_type,reason) SELECT tenant_id,id,$2,$3,$4::uuid,$5,$6 FROM listing.posts WHERE id=$1::uuid`,[postId,from,to,actorId,actorType,reason??null]);}
  private map(row:PostRow){return{id:row.id,kind:"post" as const,status:row.status,title:row.title,categorySlug:row.category_slug,cityKey:row.city_key,version:Number(row.version),moderation:{reasonCode:row.moderation_reason_code,message:row.moderation_message},publishedAt:row.published_at?.toISOString(),expiresAt:row.expires_at?.toISOString(),updatedAt:row.updated_at.toISOString(),createdAt:row.created_at.toISOString()};}
}
