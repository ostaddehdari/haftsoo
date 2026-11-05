import { Module } from "@nestjs/common";
import { AccountModule } from "./account/account.module";
import { AuthModule } from "./auth/auth.module";
import { CatalogModule } from "./catalog/catalog.module";
import { ChatTicketModule } from "./chat/chat-ticket.module";
import { CrmModule } from "./crm/crm.module";
import { DatabaseModule } from "./database/database.module";
import { GeoModule } from "./geo/geo.module";
import { FinanceModule } from "./finance/finance.module";
import { HealthModule } from "./health/health.module";
import { ListingModule } from "./listing/listing.module";
import { MediaModule } from "./media/media.module";
import { ModerationModule } from "./moderation/moderation.module";
import { NotificationModule } from "./notification/notification.module";
import { PlatformModule } from "./platform/platform.module";
import { SearchModule } from "./search/search.module";
import { SecurityModule } from "./security/security.module";
import { SubmissionModule } from "./submission/submission.module";

@Module({ imports: [AccountModule, AuthModule, CatalogModule, ChatTicketModule, CrmModule, DatabaseModule, FinanceModule, GeoModule, HealthModule, ListingModule, MediaModule, ModerationModule, NotificationModule, PlatformModule, SearchModule, SecurityModule, SubmissionModule] })
export class AppModule {}
