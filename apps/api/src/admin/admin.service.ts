import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PostgresUnitOfWork } from "../database/database-core";
import { UNIT_OF_WORK } from "../database/database.module";
import { reportSpec, requireAdminRole, validateConfiguration } from "./admin-core";
import { AdminRepository } from "./admin.repository";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
@Injectable() export class AdminService {
  constructor(@Inject(UNIT_OF_WORK)private readonly uow:PostgresUnitOfWork){}
  private id(value:string){if(!UUID.test(value))throw new BadRequestException({code:"admin_identity_invalid"});return value;}
  private role(value:string,mutate=false){try{return requireAdminRole(value,mutate);}catch(error){throw new ForbiddenException({code:(error as Error).message});}}
  overview(tenantId:string,role:string){this.id(tenantId);this.role(role);return this.uow.run({tenantId},client=>new AdminRepository(client).overview());}
  services(tenantId:string,role:string){this.id(tenantId);this.role(role);return this.uow.run({tenantId},client=>new AdminRepository(client).services());}
  alerts(tenantId:string,role:string){this.id(tenantId);this.role(role);return this.uow.run({tenantId},client=>new AdminRepository(client).alerts());}
  acknowledge(tenantId:string,role:string,actorId:string,alertId:string,body:Record<string,unknown>){this.id(tenantId);this.role(role,true);this.id(actorId);this.id(alertId);const note=String(body.note??"").trim();if(note.length<3||note.length>500)throw new BadRequestException({code:"admin_alert_note_invalid"});return this.uow.run({tenantId,isolationLevel:"serializable"},async client=>{const result=await new AdminRepository(client).acknowledge(alertId,actorId,note);if(!result)throw new NotFoundException({code:"admin_alert_unavailable"});return result;});}
  configurations(tenantId:string,role:string){this.id(tenantId);this.role(role);return this.uow.run({tenantId},client=>new AdminRepository(client).configurations());}
  propose(tenantId:string,role:string,actorId:string,body:Record<string,unknown>){this.id(tenantId);this.role(role,true);this.id(actorId);let config;try{config=validateConfiguration({key:body.key,environment:body.environment,value:body.value,reason:body.reason});}catch(error){throw new BadRequestException({code:(error as Error).message});}return this.uow.run({tenantId,isolationLevel:"serializable"},client=>new AdminRepository(client).proposeConfiguration({...config,actorId}));}
  approve(tenantId:string,role:string,actorId:string,requestId:string){this.id(tenantId);this.role(role,true);this.id(actorId);this.id(requestId);return this.uow.run({tenantId,isolationLevel:"serializable"},async client=>{const result=await new AdminRepository(client).approveConfiguration(requestId,actorId);if(!result)throw new BadRequestException({code:"admin_four_eyes_or_request_invalid"});return result;});}
  createReport(tenantId:string,role:string,actorId:string,body:Record<string,unknown>){this.id(tenantId);this.role(role);this.id(actorId);let spec;try{spec=reportSpec({kind:body.kind,format:body.format,from:body.from,to:body.to});}catch(error){throw new BadRequestException({code:(error as Error).message});}return this.uow.run({tenantId},client=>new AdminRepository(client).createReport({...spec,actorId}));}
  report(tenantId:string,role:string,reportId:string){this.id(tenantId);this.role(role);this.id(reportId);return this.uow.run({tenantId},async client=>{const result=await new AdminRepository(client).report(reportId);if(!result)throw new NotFoundException({code:"admin_report_not_found"});return result;});}
  audit(tenantId:string,role:string){this.id(tenantId);this.role(role);return this.uow.run({tenantId},client=>new AdminRepository(client).audit());}
}
