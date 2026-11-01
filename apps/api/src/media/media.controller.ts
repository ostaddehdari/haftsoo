import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from "@nestjs/common";
import type { InitiateMediaInput } from "./media-core";
import { MediaService } from "./media.service";
@Controller("media")
export class MediaController {
  constructor(private readonly media:MediaService){}
  private context(tenantId="",actorId=""){return{tenantId,actorId};}
  @Post("uploads") initiate(@Headers("x-tenant-id")tenantId:string|undefined,@Headers("x-actor-id")actorId:string|undefined,@Body()body:InitiateMediaInput){const c=this.context(tenantId,actorId);return this.media.initiate(c.tenantId,c.actorId,body).then((data)=>({data,meta:{version:"v1"}}));}
  @Post("uploads/:id/complete") complete(@Param("id")id:string,@Headers("x-tenant-id")tenantId:string|undefined,@Headers("x-actor-id")actorId:string|undefined,@Body()body:{etag:string}){const c=this.context(tenantId,actorId);return this.media.complete(c.tenantId,c.actorId,id,body).then((data)=>({data,meta:{version:"v1"}}));}
  @Get("drafts/:draftId") list(@Param("draftId")draftId:string,@Headers("x-tenant-id")tenantId:string|undefined,@Headers("x-actor-id")actorId:string|undefined){const c=this.context(tenantId,actorId);return this.media.list(c.tenantId,c.actorId,draftId).then((data)=>({data,meta:{version:"v1"}}));}
  @Patch("drafts/:draftId/order") reorder(@Param("draftId")draftId:string,@Headers("x-tenant-id")tenantId:string|undefined,@Headers("x-actor-id")actorId:string|undefined,@Body()body:{orderedIds:string[];coverId:string}){const c=this.context(tenantId,actorId);return this.media.reorder(c.tenantId,c.actorId,draftId,body).then((data)=>({data,meta:{version:"v1"}}));}
  @Delete("assets/:id") remove(@Param("id")id:string,@Headers("x-tenant-id")tenantId:string|undefined,@Headers("x-actor-id")actorId:string|undefined){const c=this.context(tenantId,actorId);return this.media.remove(c.tenantId,c.actorId,id).then((data)=>({data,meta:{version:"v1"}}));}
}
