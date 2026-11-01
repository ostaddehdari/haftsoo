import { Module } from "@nestjs/common";
import { ListingController } from "./listing.controller";
import { ListingExpirationWorker } from "./listing-expiration.worker";
import { ListingService } from "./listing.service";
@Module({controllers:[ListingController],providers:[ListingService,ListingExpirationWorker],exports:[ListingExpirationWorker]})
export class ListingModule{}
