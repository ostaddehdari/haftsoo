import { Injectable } from "@nestjs/common";
import { evaluateSlo, multiWindowBurnRate } from "./observability-core";
@Injectable() export class ErrorBudgetWorker { evaluate(input:{total:number;good:number;targetBps:number;windowMinutes:number}){return evaluateSlo(input);} burn(input:{shortConsumedBps:number;longConsumedBps:number;shortWindowMinutes:number;longWindowMinutes:number}){return multiWindowBurnRate(input);} }
