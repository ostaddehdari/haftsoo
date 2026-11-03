import { Module } from "@nestjs/common";
import { SecurityModule } from "../security/security.module";
import { ModerationController } from "./moderation.controller";
import { ModerationEvaluationWorker } from "./moderation-evaluation.worker";
import { ModerationModelGateway } from "./moderation-model";
import { ModerationService } from "./moderation.service";

@Module({ imports: [SecurityModule], controllers: [ModerationController], providers: [ModerationModelGateway, ModerationService, ModerationEvaluationWorker], exports: [ModerationService, ModerationEvaluationWorker] })
export class ModerationModule {}
