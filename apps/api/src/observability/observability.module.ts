import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ErrorBudgetWorker } from "./error-budget.worker";
import { ObservabilityController } from "./observability.controller";
import { ObservabilityService } from "./observability.service";
@Module({imports:[DatabaseModule],controllers:[ObservabilityController],providers:[ObservabilityService,ErrorBudgetWorker],exports:[ErrorBudgetWorker]}) export class ObservabilityModule {}
