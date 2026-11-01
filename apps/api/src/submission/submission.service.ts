import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { OutboxRepository, type PostgresUnitOfWork } from "../database/database-core";
import { UNIT_OF_WORK } from "../database/database.module";
import { assertTransition, stableSubmissionChecksum, SUBMISSION_STEPS, validateSubmission, validIdempotencyKey, type SubmissionDraftPayload, type SubmissionStep } from "./submission-core";
import { SubmissionRepository } from "./submission.repository";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class SubmissionService {
  constructor(@Inject(UNIT_OF_WORK) private readonly unitOfWork: PostgresUnitOfWork) {}

  async create(tenantId: string, actorId: string) {
    this.ids(tenantId, actorId);
    return this.unitOfWork.run({ tenantId }, (client) => new SubmissionRepository(client).create(randomUUID(), actorId));
  }

  async get(tenantId: string, actorId: string, id: string) {
    this.ids(tenantId, actorId, id);
    const draft = await this.unitOfWork.run({ tenantId }, (client) => new SubmissionRepository(client).find(id, actorId));
    if (!draft) throw new NotFoundException("submission draft was not found");
    return draft;
  }

  async save(tenantId: string, actorId: string, id: string, input: { revision: number; currentStep: SubmissionStep; payload: SubmissionDraftPayload }) {
    this.ids(tenantId, actorId, id);
    if (!Number.isInteger(input.revision) || input.revision < 0) throw new BadRequestException("revision is invalid");
    return this.unitOfWork.run({ tenantId, isolationLevel: "serializable" }, async (client) => {
      const repository = new SubmissionRepository(client);
      const current = await repository.find(id, actorId, true);
      if (!current) throw new NotFoundException("submission draft was not found");
      assertTransition(current.currentStep, input.currentStep);
      const stepIndex = SUBMISSION_STEPS.indexOf(input.currentStep);
      const completedStep = stepIndex > 0 ? SUBMISSION_STEPS[stepIndex - 1] : undefined;
      const issues = completedStep ? validateSubmission(input.payload, completedStep) : [];
      if (issues.length) throw new BadRequestException({ code: "submission_invalid", issues });
      const saved = await repository.save(id, actorId, input.revision, input.currentStep, input.payload, stableSubmissionChecksum(input.payload));
      if (!saved) throw new ConflictException({ code: "revision_conflict", currentRevision: current.revision });
      return saved;
    });
  }

  async preview(tenantId: string, actorId: string, id: string) {
    const draft = await this.get(tenantId, actorId, id);
    const issues = validateSubmission(draft.payload);
    return { valid: issues.length === 0, issues, checksum: stableSubmissionChecksum(draft.payload), draft };
  }

  async submit(tenantId: string, actorId: string, id: string, key: string) {
    this.ids(tenantId, actorId, id);
    if (!validIdempotencyKey(key)) throw new BadRequestException("Idempotency-Key is invalid");
    return this.unitOfWork.run({ tenantId, isolationLevel: "serializable", statementTimeoutMs: 5_000 }, async (client) => {
      const repository = new SubmissionRepository(client);
      const draft = await repository.find(id, actorId, true);
      if (!draft) throw new NotFoundException("submission draft was not found");
      const issues = validateSubmission(draft.payload);
      if (issues.length) throw new BadRequestException({ code: "submission_invalid", issues });
      let result: { postId: string; replayed: boolean };
      try { result = await repository.submit(id, actorId, key, stableSubmissionChecksum(draft.payload)); }
      catch (cause) { if (cause instanceof Error && cause.message === "idempotency_conflict") throw new ConflictException({ code: "idempotency_conflict" }); throw cause; }
      if (!result.replayed) await new OutboxRepository(client).enqueue({ aggregateType: "post", aggregateId: result.postId, eventType: "post.submitted", eventVersion: 1, payload: { postId: result.postId, draftId: id, status: "pending_review" } });
      return { ...result, status: "pending_review" as const };
    });
  }

  private ids(...values: string[]): void { if (values.some((value) => !UUID.test(value))) throw new BadRequestException("tenant, actor and draft ids must be UUIDs"); }
}
