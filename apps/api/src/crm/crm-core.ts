import { createHash } from "node:crypto";

export const TICKET_CHANNELS = ["web", "chat", "phone", "email", "staff"] as const;
export const TICKET_PRIORITIES = ["urgent", "high", "normal", "low"] as const;
export const TICKET_STATES = ["open", "assigned", "waiting_customer", "waiting_internal", "resolved", "closed"] as const;
export type TicketPriority = typeof TICKET_PRIORITIES[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLA_MINUTES: Record<TicketPriority, number> = { urgent: 15, high: 60, normal: 240, low: 1440 };

export function normalizeSubject(value: unknown) { return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 160); }
export function maskCustomerContact(value: string) { return String(value ?? "").replace(/(?:\+?98|0)?9(\d{2})\d{5}(\d{2})/g, "09$1•••••$2").replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "•••@•••"); }
export function ticketFingerprint(input: { tenantId: string; customerId: string; subject: string; channel: string; now?: Date }) { const hour = (input.now ?? new Date()).toISOString().slice(0, 13); return createHash("sha256").update(`${input.tenantId}|${input.customerId}|${input.channel}|${normalizeSubject(input.subject).toLowerCase()}|${hour}`).digest("hex"); }
export function ticketDeadline(priority: TicketPriority, createdAt = new Date()) { return new Date(createdAt.getTime() + SLA_MINUTES[priority] * 60_000); }
export function validateTicket(raw: Record<string, unknown>) { const customerId = String(raw.customerId ?? ""), channel = String(raw.channel ?? "web"), priority = String(raw.priority ?? "normal") as TicketPriority, subject = normalizeSubject(raw.subject), body = String(raw.body ?? "").trim(); if (!UUID.test(customerId) || !TICKET_CHANNELS.includes(channel as typeof TICKET_CHANNELS[number]) || !TICKET_PRIORITIES.includes(priority) || subject.length < 5 || body.length < 10 || body.length > 5000) throw new Error("crm_ticket_invalid"); return { customerId, channel, priority, subject, body }; }
export function validateAssignment(raw: Record<string, unknown>) { const assigneeId = String(raw.assigneeId ?? ""), leaseMinutes = Number(raw.leaseMinutes ?? 15); if (!UUID.test(assigneeId) || !Number.isInteger(leaseMinutes) || leaseMinutes < 5 || leaseMinutes > 60) throw new Error("crm_assignment_invalid"); return { assigneeId, leaseMinutes }; }
export function validateTransition(current: string, next: string) { const allowed: Record<string, string[]> = { open: ["assigned", "closed"], assigned: ["waiting_customer", "waiting_internal", "resolved", "open"], waiting_customer: ["assigned", "resolved"], waiting_internal: ["assigned", "resolved"], resolved: ["assigned", "closed"], closed: [] }; if (!allowed[current]?.includes(next)) throw new Error("crm_transition_invalid"); return next; }
export function calculateCustomerHealth(input: { openTickets: number; overdueTickets: number; reports: number; completedDeals: number }) { const score = Math.max(0, Math.min(100, 100 - input.openTickets * 5 - input.overdueTickets * 15 - input.reports * 8 + Math.min(input.completedDeals, 10) * 2)); return { score, band: score >= 80 ? "healthy" : score >= 55 ? "attention" : "risk" } as const; }
