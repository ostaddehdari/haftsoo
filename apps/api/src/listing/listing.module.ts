import { Module } from "@nestjs/common";
import { ListingController } from "./listing.controller";
import { ListingExpirationWorker } from "./listing-expiration.worker";
import { ListingService } from "./listing.service";
import { PostDetailController } from "./post-detail.controller";
import { PostDetailService } from "./post-detail.service";
@Module({controllers:[ListingController,PostDetailController],providers:[ListingService,ListingExpirationWorker,PostDetailService],exports:[ListingExpirationWorker]})
export class ListingModule{}
