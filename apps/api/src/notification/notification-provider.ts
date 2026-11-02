import{Injectable}from"@nestjs/common";import{randomUUID}from"node:crypto";import type{NotificationChannel}from"./notification-core";
export interface ProviderRequest{deliveryId:string;channel:NotificationChannel;destination:string;title:string;body:string;idempotencyKey:string}
export interface ProviderReceipt{provider:string;providerMessageId:string;acceptedAt:string}
export interface NotificationProvider{name:string;channel:NotificationChannel;send(request:ProviderRequest):Promise<ProviderReceipt>}
@Injectable()export class NotificationProviderRegistry{
  private readonly providers=new Map<string,NotificationProvider>();
  constructor(){for(const channel of["in_app","sms","email","push"]as NotificationChannel[])this.register({name:"local",channel,async send(){return{provider:"local",providerMessageId:`local-${randomUUID()}`,acceptedAt:new Date().toISOString()};}});}
  register(provider:NotificationProvider){this.providers.set(`${provider.channel}:${provider.name}`,provider);return this;}
  resolve(channel:NotificationChannel,names:string[]){for(const name of names){const provider=this.providers.get(`${channel}:${name}`);if(provider)return provider;}const fallback=this.providers.get(`${channel}:local`);if(fallback)return fallback;throw new Error("notification_provider_unavailable");}
}
