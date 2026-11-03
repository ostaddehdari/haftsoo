import { Injectable } from "@nestjs/common";
import type { ModerationInput } from "./moderation-core";
import { ModerationService } from "./moderation.service";

@Injectable()
export class ModerationEvaluationWorker { constructor(private readonly moderation: ModerationService) {} async process(event: { tenantId: string; payload: ModerationInput & { assetIds?: string[] } }) { return this.moderation.evaluate(event.tenantId, event.payload); } }
