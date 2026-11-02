import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ChatTicketController } from "./chat-ticket.controller";
import { ChatTicketService } from "./chat-ticket.service";

@Module({ imports: [AuthModule], controllers: [ChatTicketController], providers: [ChatTicketService] })
export class ChatTicketModule {}
