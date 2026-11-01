import { Module } from "@nestjs/common";
import { SecurityModule } from "../security/security.module";
import { SearchIndexSync } from "./index-sync.worker";
import { OpenSearchClient } from "./opensearch.client";
import { SavedSearchController, SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({ imports: [SecurityModule], controllers: [SearchController, SavedSearchController], providers: [OpenSearchClient, SearchIndexSync, SearchService], exports: [SearchIndexSync] })
export class SearchModule {}
