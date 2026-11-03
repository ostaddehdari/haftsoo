import { Inject, Injectable } from "@nestjs/common";
import type { PostgresUnitOfWork } from "../database/database-core";
import { UNIT_OF_WORK } from "../database/database.module";
import { ContentOperationsRepository } from "./content-operations.repository";
@Injectable() export class ModerationSlaWorker { constructor(@Inject(UNIT_OF_WORK)private readonly uow:PostgresUnitOfWork){} run(tenantId:string){return this.uow.run({tenantId,isolationLevel:"read committed",statementTimeoutMs:5000},client=>new ContentOperationsRepository(client).breachDueCases());} }

