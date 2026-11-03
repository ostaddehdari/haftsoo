import { Module } from "@nestjs/common";
import { SecurityModule } from "../security/security.module";
import { ModerationController } from "./moderation.controller";
import { ModerationEvaluationWorker } from "./moderation-evaluation.worker";
import { ModerationModelGateway } from "./moderation-model";
import { ModerationService } from "./moderation.service";
import { ContentOperationsController } from "./content-operations.controller";
import { ContentOperationsService } from "./content-operations.service";
import { ModerationSlaWorker } from "./moderation-sla.worker";

@Module({ imports: [SecurityModule], controllers: [ModerationController,ContentOperationsController], providers: [ModerationModelGateway, ModerationService, ModerationEvaluationWorker,ContentOperationsService,ModerationSlaWorker], exports: [ModerationService, ModerationEvaluationWorker,ContentOperationsService,ModerationSlaWorker] })
export class ModerationModule {}
