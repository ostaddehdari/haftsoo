import assert from "node:assert/strict";
import test from "node:test";
import { processingDecision } from "../dist/media/media-processing.worker.js";
test("clean media produces derivatives",()=>{const result=processingDecision({kind:"image",malware:false,unsafeScore:.1,duplicateToday:false});assert.equal(result.status,"ready");assert.equal(result.derivatives.length,3);});
test("malware, unsafe and same-day duplicates are rejected",()=>{assert.equal(processingDecision({kind:"image",malware:true,unsafeScore:0,duplicateToday:false}).reason,"malware_detected");assert.equal(processingDecision({kind:"video",malware:false,unsafeScore:.9,duplicateToday:false}).reason,"unsafe_content");assert.equal(processingDecision({kind:"image",malware:false,unsafeScore:0,duplicateToday:true}).reason,"same_day_duplicate");});
