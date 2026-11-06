import { Body, Controller, Get, Headers, Param, Post, UseGuards } from "@nestjs/common";
import { ServiceAuthGuard } from "../security/service-auth.guard";
import { RiskService } from "./risk.service";
@Controller("risk/admin") @UseGuards(ServiceAuthGuard) export class RiskController { constructor(private readonly service:RiskService){} private wrap(data:unknown){return{data,meta:{version:"v1"}};}
  @Get("overview")overview(@Headers("x-tenant-id")tenant="",@Headers("x-workforce-role")role=""){return this.service.overview(tenant,role).then(data=>this.wrap(data));}
  @Get("cases")queue(@Headers("x-tenant-id")tenant="",@Headers("x-workforce-role")role=""){return this.service.queue(tenant,role).then(data=>this.wrap(data));}
  @Get("cases/:id")detail(@Headers("x-tenant-id")tenant="",@Headers("x-workforce-role")role="",@Param("id")id:string){return this.service.detail(tenant,role,id).then(data=>this.wrap(data));}
  @Post("cases/:id/claim")claim(@Headers("x-tenant-id")tenant="",@Headers("x-workforce-role")role="",@Headers("x-actor-id")actor="",@Param("id")id:string){return this.service.claim(tenant,role,actor,id).then(data=>this.wrap(data));}
  @Post("cases/:id/decisions")decide(@Headers("x-tenant-id")tenant="",@Headers("x-workforce-role")role="",@Headers("x-actor-id")actor="",@Param("id")id:string,@Body()body:Record<string,unknown>){return this.service.decide(tenant,role,actor,id,body).then(data=>this.wrap(data));}
}
