import { createHash, createHmac } from "node:crypto";

export const MEDIA_POLICY = {
  maxItems: 10,
  maxImageBytes: 20 * 1024 * 1024,
  maxVideoBytes: 200 * 1024 * 1024,
  uploadTtlSeconds: 600,
  imageTypes: ["image/jpeg", "image/png", "image/webp"],
  videoTypes: ["video/mp4"]
} as const;

export type MediaKind = "image" | "video";
export type MediaStatus = "initiated" | "uploaded" | "scanning" | "processing" | "ready" | "rejected" | "failed" | "deleted";
export interface InitiateMediaInput { draftId: string; clientId: string; fileName: string; contentType: string; size: number; sha256: string; kind: MediaKind }

export function validateMediaInput(input: InitiateMediaInput): string[] {
  const errors: string[] = [];
  const types: readonly string[] = input.kind === "image" ? MEDIA_POLICY.imageTypes : MEDIA_POLICY.videoTypes;
  const max = input.kind === "image" ? MEDIA_POLICY.maxImageBytes : MEDIA_POLICY.maxVideoBytes;
  if (!types.includes(input.contentType)) errors.push("content_type_not_allowed");
  if (!Number.isSafeInteger(input.size) || input.size < 1 || input.size > max) errors.push("size_out_of_range");
  if (!/^[a-f0-9]{64}$/i.test(input.sha256)) errors.push("sha256_invalid");
  if (!/^[0-9a-f-]{36}$/i.test(input.draftId) || !/^[0-9a-f-]{36}$/i.test(input.clientId)) errors.push("identifier_invalid");
  return errors;
}

export function safeObjectKey(tenantId: string, actorId: string, assetId: string, contentType: string): string {
  const extension: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4" };
  const day = new Date().toISOString().slice(0, 10);
  return `tenant/${tenantId}/owner/${actorId}/${day}/${assetId}/original.${extension[contentType] ?? "bin"}`;
}

export function derivativePlan(kind: MediaKind) {
  return kind === "image"
    ? [{ name: "thumbnail", format: "webp", width: 320 }, { name: "card", format: "webp", width: 720 }, { name: "detail", format: "webp", width: 1440 }]
    : [{ name: "poster", format: "webp", width: 720 }, { name: "stream", format: "mp4", maxHeight: 720 }];
}

const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
const hmac = (key: Buffer | string, value: string) => createHmac("sha256", key).update(value).digest();
export function presignPut(input: { endpoint: string; region: string; bucket: string; accessKey: string; secretKey: string; key: string; contentType: string; checksum: string; expires: number; now?: Date }) {
  const checksum = /^[a-f0-9]{64}$/i.test(input.checksum) ? Buffer.from(input.checksum, "hex").toString("base64") : input.checksum;
  const now = input.now ?? new Date(); const stamp = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); const date = stamp.slice(0, 8);
  const endpoint = new URL(input.endpoint); const path = `/${encode(input.bucket)}/${input.key.split("/").map(encode).join("/")}`;
  const scope = `${date}/${input.region}/s3/aws4_request`; const signedHeaders = "content-type;host;x-amz-checksum-sha256";
  const params: Record<string, string> = { "X-Amz-Algorithm": "AWS4-HMAC-SHA256", "X-Amz-Credential": `${input.accessKey}/${scope}`, "X-Amz-Date": stamp, "X-Amz-Expires": String(Math.min(input.expires, 900)), "X-Amz-SignedHeaders": signedHeaders };
  const query = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${encode(key)}=${encode(value)}`).join("&");
  const canonical = `PUT\n${path}\n${query}\ncontent-type:${input.contentType}\nhost:${endpoint.host}\nx-amz-checksum-sha256:${checksum}\n\n${signedHeaders}\nUNSIGNED-PAYLOAD`;
  const stringToSign = `AWS4-HMAC-SHA256\n${stamp}\n${scope}\n${createHash("sha256").update(canonical).digest("hex")}`;
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${input.secretKey}`, date), input.region), "s3"), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  return { url: `${endpoint.origin}${path}?${query}&X-Amz-Signature=${signature}`, headers: { "content-type": input.contentType, "x-amz-checksum-sha256": checksum }, expiresAt: new Date(now.getTime() + Math.min(input.expires, 900) * 1000).toISOString() };
}

export function duplicateFingerprint(perceptualHash: string, actorId: string, day: string): string {
  if (!/^[a-f0-9]{16,128}$/i.test(perceptualHash)) throw new Error("perceptual hash is invalid");
  return createHash("sha256").update(`${actorId}:${day}:${perceptualHash.toLowerCase()}`).digest("hex");
}
