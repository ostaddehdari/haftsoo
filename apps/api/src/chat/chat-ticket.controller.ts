import { Body, Controller, Headers, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ChatTicketService } from "./chat-ticket.service";

@Controller("chat")
export class ChatTicketController {
  constructor(private readonly auth: AuthService, private readonly tickets: ChatTicketService) {}

  @Post("ticket")
  async issue(@Headers("x-tenant-id") tenantId: string | undefined, @Headers("authorization") authorization: string | undefined, @Body() body: { postToken?: string }) {
    const session = await this.auth.requireSession(tenantId ?? "", authorization);
    return { data: this.tickets.issue({ tenantId: tenantId ?? "", userId: session.user_id, sessionId: session.id, postToken: body.postToken }), meta: { version: "v1" } };
  }
}
