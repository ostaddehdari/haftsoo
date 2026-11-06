import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { RiskController } from "./risk.controller";
import { RiskEvaluationWorker } from "./risk-evaluation.worker";
import { RiskService } from "./risk.service";
@Module({imports:[DatabaseModule],controllers:[RiskController],providers:[RiskService,RiskEvaluationWorker],exports:[RiskEvaluationWorker]}) export class RiskModule {}
