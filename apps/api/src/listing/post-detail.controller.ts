import { Body, Controller, Get, Headers, Param, Post, Put } from "@nestjs/common";
import { PostDetailService } from "./post-detail.service";
@Controller()
export class PostDetailController{
  constructor(private readonly posts:PostDetailService){}
  @Get("posts/:token")detail(@Param("token")token:string,@Headers("x-tenant-id")tenant="",@Headers("x-public-base-url")baseUrl?:string){return this.posts.detail(tenant,token,baseUrl).then(data=>({data,meta:{version:"v1"}}));}
  @Post("posts/:token/contact")contact(@Param("token")token:string,@Headers("x-tenant-id")tenant="",@Headers("x-actor-id")actor="",@Body()body:{requestId:string}){return this.posts.contact(tenant,actor,token,body.requestId).then(data=>({data,meta:{version:"v1"}}));}
  @Put("my/bookmarks/:token")bookmark(@Param("token")token:string,@Headers("x-tenant-id")tenant="",@Headers("x-actor-id")actor="",@Body()body:{active:boolean}){return this.posts.bookmark(tenant,actor,token,body.active===true).then(data=>({data,meta:{version:"v1"}}));}
  @Put("my/post-notes/:token")note(@Param("token")token:string,@Headers("x-tenant-id")tenant="",@Headers("x-actor-id")actor="",@Body()body:{note:string}){return this.posts.note(tenant,actor,token,body.note).then(data=>({data,meta:{version:"v1"}}));}
  @Post("posts/:token/reports")report(@Param("token")token:string,@Headers("x-tenant-id")tenant="",@Headers("x-actor-id")actor="",@Body()body:{reason:string;description?:string}){return this.posts.report(tenant,actor,token,body).then(data=>({data,meta:{version:"v1"}}));}
}
