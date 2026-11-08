import { Module } from "@nestjs/common";
import { AccountModule } from "./account/account.module";
import { AdminModule } from "./admin/admin.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AuthModule } from "./auth/auth.module";
import { BusinessModule } from "./business/business.module";
import { CatalogModule } from "./catalog/catalog.module";
import { ChatTicketModule } from "./chat/chat-ticket.module";
import { CrmModule } from "./crm/crm.module";
import { DatabaseModule } from "./database/database.module";
import { GeoModule } from "./geo/geo.module";
import { FinanceModule } from "./finance/finance.module";
import { HealthModule } from "./health/health.module";
import { ListingModule } from "./listing/listing.module";
import { MediaModule } from "./media/media.module";
import { MonetizationModule } from "./monetization/monetization.module";
import { ModerationModule } from "./moderation/moderation.module";
import { NotificationModule } from "./notification/notification.module";
import { ObservabilityModule } from "./observability/observability.module";
import { PerformanceModule } from "./performance/performance.module";
import { PlatformModule } from "./platform/platform.module";
import { PrivacyModule } from "./privacy/privacy.module";
import { QualityModule } from "./quality/quality.module";
import { RiskModule } from "./risk/risk.module";
import { ResilienceModule } from "./resilience/resilience.module";
import { SearchModule } from "./search/search.module";
import { SecurityModule } from "./security/security.module";
import { SubmissionModule } from "./submission/submission.module";
import { VulnerabilityModule } from "./vulnerability/vulnerability.module";

@Module({ imports: [AccountModule, AdminModule, AnalyticsModule, AuthModule, BusinessModule, CatalogModule, ChatTicketModule, CrmModule, DatabaseModule, FinanceModule, GeoModule, HealthModule, ListingModule, MediaModule, MonetizationModule, ModerationModule, NotificationModule, ObservabilityModule, PerformanceModule, PlatformModule, PrivacyModule, QualityModule, ResilienceModule, RiskModule, SearchModule, SecurityModule, SubmissionModule, VulnerabilityModule] })
export class AppModule {}
