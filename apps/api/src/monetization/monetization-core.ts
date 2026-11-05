export const PRODUCT_KINDS = ["bump", "urgent", "featured", "storefront", "package", "subscription"] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

export type Price = { amount: number; currency: "IRR"; startsAt: Date; endsAt?: Date | null };
export type Coupon = { code: string; kind: "fixed" | "percentage"; value: number; minimumAmount: number; maximumDiscount?: number | null; startsAt: Date; endsAt: Date; usageLimit?: number | null; used: number };

export function validateProduct(input: { code: unknown; kind: unknown; durationMinutes?: unknown; quota?: unknown }) {
  const code = String(input.code ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(code) || !PRODUCT_KINDS.includes(input.kind as ProductKind)) throw new Error("monetization_product_invalid");
  const durationMinutes = Number(input.durationMinutes ?? 0);
  const quota = Number(input.quota ?? 1);
  if (!Number.isSafeInteger(durationMinutes) || durationMinutes < 0 || durationMinutes > 525_600 || !Number.isSafeInteger(quota) || quota < 1 || quota > 10_000) throw new Error("monetization_product_limits_invalid");
  return { code, kind: input.kind as ProductKind, durationMinutes, quota };
}

export function activePrice(prices: Price[], at = new Date()) {
  const candidates = prices.filter(item => item.currency === "IRR" && Number.isSafeInteger(item.amount) && item.amount > 0 && item.startsAt <= at && (!item.endsAt || item.endsAt > at)).sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  if (!candidates.length) throw new Error("monetization_price_unavailable");
  return candidates[0];
}

export function applyCoupon(subtotal: number, coupon: Coupon, at = new Date()) {
  if (!Number.isSafeInteger(subtotal) || subtotal <= 0 || !/^[A-Z0-9_-]{3,32}$/.test(coupon.code) || at < coupon.startsAt || at >= coupon.endsAt || subtotal < coupon.minimumAmount || (coupon.usageLimit != null && coupon.used >= coupon.usageLimit)) throw new Error("monetization_coupon_invalid");
  const raw = coupon.kind === "percentage" ? Math.floor((subtotal * coupon.value) / 10_000) : coupon.value;
  const discount = Math.min(subtotal, raw, coupon.maximumDiscount ?? raw);
  return { subtotal, discount, payable: subtotal - discount, code: coupon.code };
}

export function orderTotals(lines: Array<{ unitAmount: number; quantity: number }>, discount = 0, taxBps = 0) {
  if (!lines.length || lines.some(line => !Number.isSafeInteger(line.unitAmount) || line.unitAmount <= 0 || !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 100) || !Number.isSafeInteger(discount) || discount < 0 || !Number.isInteger(taxBps) || taxBps < 0 || taxBps > 10_000) throw new Error("monetization_order_invalid");
  const subtotal = lines.reduce((sum, line) => sum + line.unitAmount * line.quantity, 0);
  if (!Number.isSafeInteger(subtotal) || discount > subtotal) throw new Error("monetization_order_total_invalid");
  const tax = Math.floor(((subtotal - discount) * taxBps) / 10_000);
  return { subtotal, discount, tax, total: subtotal - discount + tax, currency: "IRR" as const };
}

export function consumeQuota(input: { granted: number; consumed: number; amount?: number; expiresAt?: Date | null }, at = new Date()) {
  const amount = input.amount ?? 1;
  if (![input.granted, input.consumed, amount].every(Number.isSafeInteger) || input.granted < 1 || input.consumed < 0 || amount < 1 || input.consumed + amount > input.granted || (input.expiresAt && input.expiresAt <= at)) throw new Error("monetization_quota_unavailable");
  return { consumed: input.consumed + amount, remaining: input.granted - input.consumed - amount };
}

export function promotionWindow(startsAt: Date, durationMinutes: number, maximumMinutes = 43_200) {
  if (!(startsAt instanceof Date) || Number.isNaN(startsAt.getTime()) || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > maximumMinutes) throw new Error("monetization_promotion_window_invalid");
  return { startsAt, endsAt: new Date(startsAt.getTime() + durationMinutes * 60_000) };
}

export function subscriptionPeriod(startsAt: Date, months: number) {
  if (!(startsAt instanceof Date) || Number.isNaN(startsAt.getTime()) || !Number.isInteger(months) || months < 1 || months > 12) throw new Error("monetization_subscription_period_invalid");
  const renewsAt = new Date(Date.UTC(startsAt.getUTCFullYear(), startsAt.getUTCMonth() + months, startsAt.getUTCDate(), startsAt.getUTCHours(), startsAt.getUTCMinutes(), startsAt.getUTCSeconds()));
  return { startsAt, renewsAt };
}
