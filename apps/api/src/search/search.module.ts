import { Module } from "@nestjs/common";
import { SecurityModule } from "../security/security.module";
import { SearchIndexSync } from "./index-sync.worker";
import { MapViewController } from "./map-view.controller";
import { MapViewService } from "./map-view.service";
import { OpenSearchClient } from "./opensearch.client";
import { SavedSearchController, SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({ imports: [SecurityModule], controllers: [MapViewController, SearchController, SavedSearchController], providers: [MapViewService, OpenSearchClient, SearchIndexSync, SearchService], exports: [SearchIndexSync] })
export class SearchModule {}
