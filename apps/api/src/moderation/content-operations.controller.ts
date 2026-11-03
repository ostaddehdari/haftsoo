import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ServiceAuthGuard } from "../security/service-auth.guard";
import { ContentOperationsService } from "./content-operations.service";

@Controller("content-operations") @UseGuards(ServiceAuthGuard)
export class ContentOperationsController { constructor(private readonly operations:ContentOperationsService){} private wrap(data:unknown){return{data,meta:{version:"v1"}};}
  @Post("reports") report(@Headers("x-tenant-id")tenantId="",@Headers("x-actor-id")actorId="",@Body()body:Record<string,unknown>){return this.operations.report(tenantId,actorId,body).then(data=>this.wrap(data));}
  @Get("queue") queue(@Headers("x-tenant-id")tenantId="",@Query("state")state?:string,@Query("limit")limit?:string){return this.operations.queue(tenantId,state,Number(limit)).then(data=>this.wrap(data));}
  @Post("cases/:id/claim") claim(@Headers("x-tenant-id")tenantId="",@Headers("x-actor-id")actorId="",@Param("id")id:string,@Body()body:Record<string,unknown>){return this.operations.claim(tenantId,actorId,id,body).then(data=>this.wrap(data));}
  @Post("cases/:id/release") release(@Headers("x-tenant-id")tenantId="",@Headers("x-actor-id")actorId="",@Param("id")id:string){return this.operations.release(tenantId,actorId,id).then(data=>this.wrap(data));}
  @Post("cases/:id/escalate") escalate(@Headers("x-tenant-id")tenantId="",@Headers("x-actor-id")actorId="",@Param("id")id:string,@Body()body:Record<string,unknown>){return this.operations.escalate(tenantId,actorId,id,body).then(data=>this.wrap(data));}
  @Get("cases/:id/timeline") timeline(@Headers("x-tenant-id")tenantId="",@Param("id")id:string){return this.operations.timeline(tenantId,id).then(data=>this.wrap(data));}
  @Get("metrics") metrics(@Headers("x-tenant-id")tenantId=""){return this.operations.metrics(tenantId).then(data=>this.wrap(data));}
}

