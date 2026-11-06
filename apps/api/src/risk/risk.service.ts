import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PostgresUnitOfWork } from "../database/database-core";
import { UNIT_OF_WORK } from "../database/database.module";
import { approveRiskDecision, requireRiskRole, type RiskAction } from "./risk-core";
import { RiskRepository } from "./risk.repository";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
@Injectable() export class RiskService { constructor(@Inject(UNIT_OF_WORK)private readonly uow:PostgresUnitOfWork){} private id(value:string){if(!UUID.test(value))throw new BadRequestException({code:"risk_id_invalid"});return value;} private role(value:string,mutate=false){try{return requireRiskRole(value,mutate)}catch(error){throw new ForbiddenException({code:(error as Error).message})}}
  overview(tenant:string,role:string){this.id(tenant);this.role(role);return this.uow.run({tenantId:tenant},client=>new RiskRepository(client).overview());}
  queue(tenant:string,role:string){this.id(tenant);this.role(role);return this.uow.run({tenantId:tenant},client=>new RiskRepository(client).queue());}
  detail(tenant:string,role:string,id:string){this.id(tenant);this.role(role);this.id(id);return this.uow.run({tenantId:tenant},async client=>{const result=await new RiskRepository(client).caseById(id);if(!result)throw new NotFoundException({code:"risk_case_not_found"});return result;});}
  claim(tenant:string,role:string,actor:string,id:string){this.id(tenant);this.role(role);this.id(actor);this.id(id);return this.uow.run({tenantId:tenant,isolationLevel:"serializable"},async client=>{const result=await new RiskRepository(client).claim(id,actor);if(!result)throw new BadRequestException({code:"risk_case_claim_conflict"});return result;});}
  decide(tenant:string,role:string,actor:string,id:string,body:Record<string,unknown>){this.id(tenant);this.role(role);this.id(actor);this.id(id);const action=String(body.action??"")as RiskAction,approverId=String(body.approverId??""),reason=String(body.reason??"");try{approveRiskDecision({action,actorId:actor,approverId:approverId||undefined,reason});}catch(error){throw new BadRequestException({code:(error as Error).message});}return this.uow.run({tenantId:tenant,isolationLevel:"serializable"},client=>new RiskRepository(client).decide({caseId:id,actorId:actor,approverId:approverId||null,action,reason:reason.trim()}));}
}
