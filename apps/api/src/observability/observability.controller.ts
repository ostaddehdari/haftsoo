import { Body, Controller, Get, Headers, Param, Post, UseGuards } from "@nestjs/common";
import { ServiceAuthGuard } from "../security/service-auth.guard";
import { ObservabilityService } from "./observability.service";
@Controller("observability/admin") @UseGuards(ServiceAuthGuard) export class ObservabilityController { constructor(private readonly service:ObservabilityService){} private wrap(data:unknown){return{data,meta:{version:"v1"}};}
  @Get("overview")overview(@Headers("x-tenant-id")tenant="",@Headers("x-workforce-role")role=""){return this.service.overview(tenant,role).then(data=>this.wrap(data));}
  @Get("incidents")incidents(@Headers("x-tenant-id")tenant="",@Headers("x-workforce-role")role=""){return this.service.incidents(tenant,role).then(data=>this.wrap(data));}
  @Get("incidents/:id")detail(@Headers("x-tenant-id")tenant="",@Headers("x-workforce-role")role="",@Param("id")id:string){return this.service.detail(tenant,role,id).then(data=>this.wrap(data));}
  @Post("incidents/:id/transitions")transition(@Headers("x-tenant-id")tenant="",@Headers("x-workforce-role")role="",@Headers("x-actor-id")actor="",@Param("id")id:string,@Body()body:Record<string,unknown>){return this.service.transition(tenant,role,actor,id,body).then(data=>this.wrap(data));}
}
