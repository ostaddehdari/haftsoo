import { Injectable } from "@nestjs/common";
import { existsSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createChatTicket } from "./chat-ticket-core";

function runtimeKey() {
  const value = process.env.CHAT_TICKET_SIGNING_KEY;
  const file = process.env.CHAT_TICKET_SIGNING_KEY_FILE;
  if (value) return value;
  if (file && existsSync(file)) return readFileSync(file, "utf8").trim();
  if (!process.env.NODE_ENV || ["development", "test"].includes(process.env.NODE_ENV)) return randomBytes(48).toString("base64url");
  throw new Error("CHAT_TICKET_SIGNING_KEY_FILE is required");
}

@Injectable()
export class ChatTicketService {
  private readonly key = runtimeKey();

  issue(input: { tenantId: string; userId: string; sessionId: string; postToken?: string }) {
    const result = createChatTicket(input, this.key);
    return { ticket: result.ticket, expiresAt: result.expiresAt, websocketPath: "/v1/chat/ws" };
  }
}
