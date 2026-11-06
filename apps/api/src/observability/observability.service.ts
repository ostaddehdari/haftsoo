import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PostgresUnitOfWork } from "../database/database-core";
import { UNIT_OF_WORK } from "../database/database.module";
import { requireSreRole, transitionIncident, type IncidentSeverity, type IncidentState } from "./observability-core";
import { ObservabilityRepository } from "./observability.repository";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
@Injectable() export class ObservabilityService { constructor(@Inject(UNIT_OF_WORK)private readonly uow:PostgresUnitOfWork){} private id(value:string){if(!UUID.test(value))throw new BadRequestException({code:"observability_id_invalid"});return value;} private role(value:string,command=false){try{return requireSreRole(value,command)}catch(error){throw new ForbiddenException({code:(error as Error).message})}}
  overview(tenant:string,role:string){this.id(tenant);this.role(role);return this.uow.run({tenantId:tenant},client=>new ObservabilityRepository(client).overview());}
  incidents(tenant:string,role:string){this.id(tenant);this.role(role);return this.uow.run({tenantId:tenant},client=>new ObservabilityRepository(client).incidents());}
  detail(tenant:string,role:string,id:string){this.id(tenant);this.role(role);this.id(id);return this.uow.run({tenantId:tenant},async client=>{const result=await new ObservabilityRepository(client).incidentById(id);if(!result)throw new NotFoundException({code:"incident_not_found"});return result;});}
  transition(tenant:string,role:string,actor:string,id:string,body:Record<string,unknown>){this.id(tenant);this.role(role);this.id(actor);this.id(id);const current=String(body.current??"")as IncidentState,next=String(body.next??"")as IncidentState,severity=String(body.severity??"")as IncidentSeverity,summary=String(body.summary??"");try{transitionIncident({current,next,severity,actorRole:role,summary});}catch(error){throw new BadRequestException({code:(error as Error).message});}return this.uow.run({tenantId:tenant,isolationLevel:"serializable"},client=>new ObservabilityRepository(client).transition({incidentId:id,actorId:actor,next,summary:summary.trim()}));}
}
