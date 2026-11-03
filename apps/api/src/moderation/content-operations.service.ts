import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PostgresUnitOfWork } from "../database/database-core";
import { UNIT_OF_WORK } from "../database/database.module";
import { reportFingerprint, riskBandForReport, slaDeadline, validateClaim, validateEscalation, validateUserReport } from "./content-operations-core";
import { ContentOperationsRepository } from "./content-operations.repository";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
@Injectable()
export class ContentOperationsService { constructor(@Inject(UNIT_OF_WORK) private readonly uow: PostgresUnitOfWork) {}
  private identities(...values:string[]){if(!values.every(value=>UUID.test(value)))throw new BadRequestException({code:"operations_identity_invalid"});}
  async report(tenantId:string,reporterId:string,raw:Record<string,unknown>){this.identities(tenantId,reporterId);let input;try{input=validateUserReport(raw);}catch(error){throw new BadRequestException({code:(error as Error).message});}const riskBand=riskBandForReport(input.reason);return this.uow.run({tenantId,isolationLevel:"serializable"},client=>new ContentOperationsRepository(client).report({...input,reporterId,riskBand,fingerprint:reportFingerprint({tenantId,reporterId,postId:input.postId,reason:input.reason}),dueAt:slaDeadline(riskBand)}));}
  async queue(tenantId:string,state="all",limit=50){this.identities(tenantId);if(!["all","open","claimed","appealed","escalated","resolved"].includes(state))throw new BadRequestException({code:"operations_queue_invalid"});return this.uow.run({tenantId},client=>new ContentOperationsRepository(client).queue(state,Math.min(Math.max(limit||50,1),100)));}
  async claim(tenantId:string,actorId:string,caseId:string,raw:Record<string,unknown>){this.identities(tenantId,actorId,caseId);let input;try{input=validateClaim(raw);}catch(error){throw new BadRequestException({code:(error as Error).message});}const row=await this.uow.run({tenantId,isolationLevel:"serializable"},client=>new ContentOperationsRepository(client).claim(caseId,actorId,input.leaseMinutes));if(!row)throw new ConflictException({code:"case_already_claimed"});return row;}
  async release(tenantId:string,actorId:string,caseId:string){this.identities(tenantId,actorId,caseId);const row=await this.uow.run({tenantId},client=>new ContentOperationsRepository(client).release(caseId,actorId));if(!row)throw new ConflictException({code:"case_release_denied"});return row;}
  async escalate(tenantId:string,actorId:string,caseId:string,raw:Record<string,unknown>){this.identities(tenantId,actorId,caseId);let input;try{input=validateEscalation(raw);}catch(error){throw new BadRequestException({code:(error as Error).message});}const row=await this.uow.run({tenantId,isolationLevel:"serializable"},client=>new ContentOperationsRepository(client).escalate(caseId,actorId,input));if(!row)throw new ConflictException({code:"case_escalation_denied"});return row;}
  async timeline(tenantId:string,caseId:string){this.identities(tenantId,caseId);const rows=await this.uow.run({tenantId},client=>new ContentOperationsRepository(client).timeline(caseId));if(!rows)throw new NotFoundException({code:"case_not_found"});return rows;}
  async metrics(tenantId:string){this.identities(tenantId);return this.uow.run({tenantId},client=>new ContentOperationsRepository(client).metrics());}
}

