import { Injectable } from "@nestjs/common";

export type TextModelResult = { score: number; labels: string[]; modelVersion: string };
export type VisionModelResult = { unsafeScore: number; labels: string[]; modelVersion: string };

@Injectable()
export class ModerationModelGateway {
  readonly textVersion = process.env.MODERATION_TEXT_MODEL_VERSION ?? "text-fa-1";
  readonly visionVersion = process.env.MODERATION_VISION_MODEL_VERSION ?? "vision-safe-1";
  async scoreText(_title: string, _description: string): Promise<TextModelResult> { return { score: 0, labels: [], modelVersion: this.textVersion }; }
  async scoreImages(_assetIds: string[]): Promise<VisionModelResult> { return { unsafeScore: 0, labels: [], modelVersion: this.visionVersion }; }
}
