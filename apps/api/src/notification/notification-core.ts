import { createHmac, timingSafeEqual } from "node:crypto";

export type NotificationCategory="listing"|"chat"|"search"|"security"|"finance"|"marketing"|"system";
export type NotificationChannel="in_app"|"sms"|"email"|"push";
export type DeliveryState="queued"|"sending"|"sent"|"delivered"|"retry"|"failed"|"suppressed";
export const NOTIFICATION_POLICY={pageSize:30,maxPageSize:100,maxAttempts:5,retrySeconds:[60,300,1800,7200,21600],callbackSkewSeconds:300,templateVariables:20,maxBodyLength:2000} as const;
const CATEGORIES=new Set<NotificationCategory>(["listing","chat","search","security","finance","marketing","system"]),CHANNELS=new Set<NotificationChannel>(["in_app","sms","email","push"]),TIME=/^(?:[01]\d|2[0-3]):[0-5]\d$/,TZ=/^[A-Za-z_]+(?:\/[A-Za-z_+-]+)+$/;
export interface NotificationPreferenceInput{inApp:boolean;sms:boolean;email:boolean;push:boolean;categories:Record<string,boolean>;quietStart:string|null;quietEnd:string|null;timezone:string}
export interface NotificationPreferences extends NotificationPreferenceInput{userId?:string}
export function normalizePreferences(raw:Record<string,unknown>):NotificationPreferenceInput{
  const source=(raw.categories&&typeof raw.categories==="object"?raw.categories:{}) as Record<string,unknown>,categories:Record<string,boolean>={};
  for(const category of CATEGORIES)categories[category]=category==="security"?true:category==="marketing"?source[category]===true:source[category]!==false;
  const quietStart=raw.quietStart==null||raw.quietStart===""?null:String(raw.quietStart),quietEnd=raw.quietEnd==null||raw.quietEnd===""?null:String(raw.quietEnd),timezone=String(raw.timezone??"Asia/Tehran");
  if((quietStart===null)!==(quietEnd===null)||quietStart&&!TIME.test(quietStart)||quietEnd&&!TIME.test(quietEnd))throw new Error("quiet_hours_invalid");
  if(!TZ.test(timezone)||timezone.length>64)throw new Error("timezone_invalid");
  return{inApp:raw.inApp!==false,sms:raw.sms===true,email:raw.email===true,push:raw.push===true,categories,quietStart,quietEnd,timezone};
}
export function renderTemplate(template:string,variables:Record<string,string|number>,allowed:string[]){
  if(allowed.length>NOTIFICATION_POLICY.templateVariables)throw new Error("template_variables_exceeded");
  const allow=new Set(allowed),used=new Set<string>();
  const rendered=template.replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g,(_,key:string)=>{if(!allow.has(key)||variables[key]===undefined)throw new Error(`template_variable_missing:${key}`);used.add(key);return String(variables[key]);});
  if(/\{\{.*?\}\}/.test(rendered)||rendered.length>NOTIFICATION_POLICY.maxBodyLength)throw new Error("template_render_invalid");
  return{rendered,used:[...used]};
}
function localMinutes(date:Date,timezone:string){const parts=new Intl.DateTimeFormat("en-GB",{timeZone:timezone,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date),hour=Number(parts.find(p=>p.type==="hour")?.value??0),minute=Number(parts.find(p=>p.type==="minute")?.value??0);return hour*60+minute;}
function minutes(value:string){const[h,m]=value.split(":").map(Number);return h*60+m;}
export function inQuietHours(preferences:NotificationPreferences,now=new Date()){
  if(!preferences.quietStart||!preferences.quietEnd)return false;const current=localMinutes(now,preferences.timezone),start=minutes(preferences.quietStart),end=minutes(preferences.quietEnd);return start<=end?current>=start&&current<end:current>=start||current<end;
}
export function channelAllowed(preferences:NotificationPreferences,category:NotificationCategory,channel:NotificationChannel,now=new Date()){
  if(category==="security"&&channel==="in_app")return true;
  if(preferences.categories[category]===false)return false;
  const enabled={in_app:preferences.inApp,sms:preferences.sms,email:preferences.email,push:preferences.push}[channel];
  return Boolean(enabled)&&!(channel!=="in_app"&&inQuietHours(preferences,now));
}
export function retryPlan(attempt:number,now=new Date()){if(attempt>=NOTIFICATION_POLICY.maxAttempts)return{state:"failed" as DeliveryState,nextAttemptAt:null};const delay=NOTIFICATION_POLICY.retrySeconds[Math.max(0,attempt-1)]??NOTIFICATION_POLICY.retrySeconds.at(-1)!;return{state:"retry" as DeliveryState,nextAttemptAt:new Date(now.getTime()+delay*1000)};}
export function normalizeNotificationInput(raw:Record<string,unknown>){const category=String(raw.category??"") as NotificationCategory,channel=String(raw.channel??"in_app") as NotificationChannel,title=String(raw.title??"").trim(),body=String(raw.body??"").trim(),dedupeKey=String(raw.dedupeKey??"").trim();if(!CATEGORIES.has(category)||!CHANNELS.has(channel))throw new Error("notification_route_invalid");if(title.length<1||title.length>160||body.length<1||body.length>NOTIFICATION_POLICY.maxBodyLength)throw new Error("notification_content_invalid");if(!/^[A-Za-z0-9:_-]{8,160}$/.test(dedupeKey))throw new Error("notification_dedupe_invalid");return{category,channel,title,body,dedupeKey,actionUrl:raw.actionUrl?String(raw.actionUrl).slice(0,500):null};}
export function verifyProviderSignature(payload:string,timestamp:string,signature:string,secret:string,now=Date.now()){const seconds=Number(timestamp);if(!Number.isFinite(seconds)||Math.abs(Math.floor(now/1000)-seconds)>NOTIFICATION_POLICY.callbackSkewSeconds)return false;const expected=createHmac("sha256",secret).update(`${timestamp}.${payload}`).digest("hex"),left=Buffer.from(expected),right=Buffer.from(signature||"");return left.length===right.length&&timingSafeEqual(left,right);}
