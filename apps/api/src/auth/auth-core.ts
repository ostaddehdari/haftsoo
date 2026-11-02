import { createCipheriv, createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export type AuthDeliveryMethod = "sms" | "call" | "messenger";
export type AuthFailureCode = "invalid_phone" | "cooldown" | "rate_limited" | "challenge_expired" | "invalid_code" | "attempts_exhausted" | "refresh_reuse" | "session_revoked";
export const AUTH_POLICY = { otpDigits: 6, otpTtlSeconds: 120, resendCooldownSeconds: 30, maximumSendsPerHour: 6, maximumAttempts: 5, accessTtlSeconds: 600, refreshTtlSeconds: 2_592_000, idleTtlSeconds: 3_600 } as const;

const persianDigits = "۰۱۲۳۴۵۶۷۸۹", arabicDigits = "٠١٢٣٤٥٦٧٨٩";
export function asciiDigits(value: string): string { return [...value].map(character => { const fa=persianDigits.indexOf(character),ar=arabicDigits.indexOf(character);return fa>=0?String(fa):ar>=0?String(ar):character; }).join(""); }
export function normalizeIranPhone(value: string): string { const digits=asciiDigits(value).replace(/[^0-9+]/g,"");let local=digits;if(local.startsWith("+98"))local=`0${local.slice(3)}`;else if(local.startsWith("0098"))local=`0${local.slice(4)}`;else if(local.startsWith("98")&&local.length===12)local=`0${local.slice(2)}`;if(!/^09[0-9]{9}$/.test(local))throw new Error("invalid_phone");return`+98${local.slice(1)}`; }
export function maskPhone(phone: string): string { return `${phone.slice(0,5)}***${phone.slice(-3)}`; }
export function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
export function keyedHash(value: string, key: string): string { return createHmac("sha256",key).update(value).digest("hex"); }
export function opaqueToken(bytes=32): string { return randomBytes(bytes).toString("base64url"); }
export function otpCode(): string { return String(randomInt(0,10**AUTH_POLICY.otpDigits)).padStart(AUTH_POLICY.otpDigits,"0"); }
export function otpHash(preAuthSessionId:string,code:string,key:string):string{return keyedHash(`${preAuthSessionId}:${asciiDigits(code)}`,key);}
export function verifyOtp(preAuthSessionId:string,code:string,expected:string,key:string):boolean{if(!/^[0-9]{6}$/.test(asciiDigits(code)))return false;const actual=Buffer.from(otpHash(preAuthSessionId,code,key),"hex"),stored=Buffer.from(expected,"hex");return actual.length===stored.length&&timingSafeEqual(actual,stored);}
export function encryptPhone(phone:string,keyMaterial:string):string{const key=createHash("sha256").update(keyMaterial).digest(),iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key,iv),encrypted=Buffer.concat([cipher.update(phone,"utf8"),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString("base64url");}
export function fingerprintDevice(userAgent:string,clientId:string):string{return sha256(`${userAgent.trim().slice(0,300)}\n${clientId.trim().slice(0,128)}`);}
export function ipHash(ip:string,key:string):string{return keyedHash(ip.trim().slice(0,64),key);}

export function evaluateSendWindow(input:{lastSentAt?:Date;sentLastHour:number;now?:Date}){const now=input.now??new Date(),elapsed=input.lastSentAt?Math.floor((now.getTime()-input.lastSentAt.getTime())/1000):AUTH_POLICY.resendCooldownSeconds;if(elapsed<AUTH_POLICY.resendCooldownSeconds)return{allowed:false as const,code:"cooldown" as const,retryAfterSeconds:AUTH_POLICY.resendCooldownSeconds-elapsed};if(input.sentLastHour>=AUTH_POLICY.maximumSendsPerHour)return{allowed:false as const,code:"rate_limited" as const,retryAfterSeconds:3600};return{allowed:true as const,code:null,retryAfterSeconds:0};}
export function evaluateChallenge(input:{expiresAt:Date;attempts:number;consumedAt?:Date|null;now?:Date}){const now=input.now??new Date();if(input.consumedAt)return{allowed:false as const,code:"invalid_code" as const};if(input.attempts>=AUTH_POLICY.maximumAttempts)return{allowed:false as const,code:"attempts_exhausted" as const};if(input.expiresAt.getTime()<=now.getTime())return{allowed:false as const,code:"challenge_expired" as const};return{allowed:true as const,code:null};}
export function serializeRefreshCookie(token:string,maxAge:number=AUTH_POLICY.refreshTtlSeconds,path="/"):string{return`hs_refresh=${encodeURIComponent(token)}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;}
export function readCookie(header:string|undefined,name:string):string|undefined{for(const part of(header??"").split(";")){const[key,...rest]=part.trim().split("=");if(key===name)return decodeURIComponent(rest.join("="));}return undefined;}
export function bearerToken(header:string|undefined):string|undefined{const match=header?.match(/^Bearer\s+([A-Za-z0-9_-]{32,256})$/i);return match?.[1];}
