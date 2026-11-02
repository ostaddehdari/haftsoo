import{Injectable}from"@nestjs/common";import{NotificationService}from"./notification.service";
@Injectable()export class NotificationDispatchWorker{constructor(private readonly notifications:NotificationService){}run(tenantId:string,batchSize=50){return this.notifications.dispatch(tenantId,batchSize);}}
