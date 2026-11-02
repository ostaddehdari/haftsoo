import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { existsSync, readFileSync } from "node:fs";
import type { AuthDeliveryMethod } from "./auth-core";

export interface AuthDelivery { method:AuthDeliveryMethod;destination:string;code:string;purpose:"login"|"new-login-alert";locale:"fa-IR" }
export interface DeliveryReceipt { provider:string;messageId:string;acceptedAt:string }
function secret(value:string|undefined,file:string|undefined){if(value)return value;if(file&&existsSync(file))return readFileSync(file,"utf8").trim();return undefined;}

@Injectable()
export class AuthProviderGateway{
  async send(input:AuthDelivery):Promise<DeliveryReceipt>{
    const prefix=input.method.toUpperCase(),endpoint=process.env[`AUTH_${prefix}_ENDPOINT`],credential=secret(process.env[`AUTH_${prefix}_KEY`],process.env[`AUTH_${prefix}_KEY_FILE`]),developmentMode=!process.env.NODE_ENV||["development","test"].includes(process.env.NODE_ENV);
    if(!endpoint){if(developmentMode)return{provider:`development-${input.method}`,messageId:`dev-${Date.now()}`,acceptedAt:new Date().toISOString()};throw new ServiceUnavailableException({code:"delivery_unavailable",method:input.method});}
    if(!credential&&!developmentMode)throw new ServiceUnavailableException({code:"delivery_credentials_missing",method:input.method});
    const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json",...(credential?{authorization:`Bearer ${credential}`}:{})},body:JSON.stringify({to:input.destination,template:input.purpose,parameters:{code:input.code},locale:input.locale}),signal:AbortSignal.timeout(8_000)});
    if(!response.ok)throw new ServiceUnavailableException({code:"delivery_failed",method:input.method,status:response.status});
    const payload=await response.json().catch(()=>({})) as Record<string,unknown>;
    return{provider:new URL(endpoint).hostname,messageId:String(payload.messageId??payload.id??`accepted-${Date.now()}`),acceptedAt:new Date().toISOString()};
  }
}
