import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import type { MyPostsBucket, OwnerPostAction, PostStatus } from "./listing-lifecycle-core";
import { ListingService } from "./listing.service";
@Controller()
export class ListingController{
  constructor(private readonly listings:ListingService){}
  @Get("my/posts")list(@Headers("x-tenant-id")tenant="",@Headers("x-actor-id")actor="",@Query("bucket")bucket:MyPostsBucket="active",@Query("limit")limit?:string,@Query("cursor")cursor?:string){return this.listings.list(tenant,actor,bucket,limit?Number(limit):undefined,cursor).then(data=>({data,meta:{version:"v1"}}));}
  @Get("my/posts/:id/history")history(@Param("id")id:string,@Headers("x-tenant-id")tenant="",@Headers("x-actor-id")actor=""){return this.listings.history(tenant,actor,id).then(data=>({data,meta:{version:"v1"}}));}
  @Patch("my/posts/:id")edit(@Param("id")id:string,@Headers("x-tenant-id")tenant="",@Headers("x-actor-id")actor="",@Body()body:{expectedVersion:number;patch:Record<string,unknown>}){return this.listings.edit(tenant,actor,id,body).then(data=>({data,meta:{version:"v1"}}));}
  @Post("my/posts/:id/actions")action(@Param("id")id:string,@Headers("x-tenant-id")tenant="",@Headers("x-actor-id")actor="",@Body()body:{expectedVersion:number;action:OwnerPostAction;requestId:string}){return this.listings.action(tenant,actor,id,body).then(data=>({data,meta:{version:"v1"}}));}
  @Post("moderation/posts/:id/decision")moderate(@Param("id")id:string,@Headers("x-tenant-id")tenant="",@Headers("x-actor-id")moderator="",@Body()body:{expectedVersion:number;status:PostStatus;reasonCode?:string;message?:string}){return this.listings.moderate(tenant,moderator,id,body).then(data=>({data,meta:{version:"v1"}}));}
}
