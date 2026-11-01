import { derivativePlan, type MediaKind } from "./media-core";
export type MediaProcessingDecision={status:"ready"|"rejected";reason?:string;derivatives:ReturnType<typeof derivativePlan>};
export function processingDecision(input:{kind:MediaKind;malware:boolean;unsafeScore:number;duplicateToday:boolean}):MediaProcessingDecision{
  if(input.malware)return{status:"rejected",reason:"malware_detected",derivatives:[]};
  if(input.unsafeScore>=0.85)return{status:"rejected",reason:"unsafe_content",derivatives:[]};
  if(input.duplicateToday)return{status:"rejected",reason:"same_day_duplicate",derivatives:[]};
  return{status:"ready",derivatives:derivativePlan(input.kind)};
}
