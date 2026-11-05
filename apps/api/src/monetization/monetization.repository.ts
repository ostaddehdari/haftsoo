import type { SqlClient } from "../database/database-core";
type OrderRow = { id: string; state: string; subtotal: number | string; discount: number | string; tax: number | string; total: number | string; currency: "IRR"; payment_intent_id?: string | null; created_at?: string };

export class MonetizationRepository {
  constructor(private readonly client: SqlClient) {}

  async products(audience = "personal") {
    const result = await this.client.query(`SELECT p.id,p.code,p.kind,p.title,p.description,p.duration_minutes,p.quota,p.metadata,pr.id price_id,pr.amount,pr.currency FROM monetization.products p JOIN LATERAL(SELECT id,amount,currency FROM monetization.price_versions WHERE product_id=p.id AND state='published' AND starts_at<=clock_timestamp()AND(ends_at IS NULL OR ends_at>clock_timestamp())ORDER BY starts_at DESC LIMIT 1)pr ON true WHERE p.state='active'AND($1='all'OR p.audience IN($1,'all'))ORDER BY p.sort_order,p.code`, [audience]);
    return result.rows;
  }

  async createOrder(input: { userId: string; listingId?: string; priceId: string; quantity: number; key: string; coupon?: string }) {
    const result = await this.client.query(`WITH price AS(SELECT pv.id,pv.product_id,pv.amount,pv.tax_bps FROM monetization.price_versions pv JOIN monetization.products p ON p.id=pv.product_id WHERE pv.id=$3::uuid AND pv.state='published'AND pv.starts_at<=clock_timestamp()AND(pv.ends_at IS NULL OR pv.ends_at>clock_timestamp())AND p.state='active'),coupon AS(SELECT c.* FROM monetization.coupons c WHERE c.code=NULLIF($6,'')AND c.state='active'AND c.starts_at<=clock_timestamp()AND c.ends_at>clock_timestamp()AND(c.usage_limit IS NULL OR c.used_count<c.usage_limit)AND(SELECT count(*)FROM monetization.coupon_redemptions r WHERE r.coupon_id=c.id AND r.user_id=$1::uuid)<c.per_user_limit FOR UPDATE),priced AS(SELECT price.*,price.amount*$4 subtotal,CASE WHEN $6=''THEN 0 ELSE LEAST(price.amount*$4,CASE WHEN coupon.kind='percentage'THEN floor((price.amount*$4*coupon.value)/10000)ELSE coupon.value END,coalesce(coupon.maximum_discount,price.amount*$4))END discount,coupon.id coupon_id,coupon.code coupon_code FROM price LEFT JOIN coupon ON true WHERE $6=''OR coupon.id IS NOT NULL),created AS(INSERT INTO monetization.orders(tenant_id,user_id,listing_id,idempotency_key,state,subtotal,discount,tax,total,currency,coupon_code)SELECT current_setting('app.current_tenant_id')::uuid,$1::uuid,NULLIF($2,'')::uuid,$5,'pending',subtotal,discount,floor(((subtotal-discount)*tax_bps)/10000),(subtotal-discount)+floor(((subtotal-discount)*tax_bps)/10000),'IRR',coupon_code FROM priced ON CONFLICT(tenant_id,idempotency_key)DO UPDATE SET updated_at=monetization.orders.updated_at RETURNING *)INSERT INTO monetization.order_items(tenant_id,order_id,product_id,price_version_id,quantity,unit_amount,total_amount)SELECT created.tenant_id,created.id,priced.product_id,priced.id,$4,priced.amount,priced.amount*$4 FROM created JOIN priced ON true ON CONFLICT(order_id,product_id)DO NOTHING RETURNING order_id`, [input.userId, input.listingId ?? "", input.priceId, input.quantity, input.key, input.coupon ?? ""]);
    if (result.rowCount && input.coupon) await this.client.query(`WITH redemption AS(INSERT INTO monetization.coupon_redemptions(tenant_id,coupon_id,order_id,user_id,discount)SELECT o.tenant_id,c.id,o.id,o.user_id,o.discount FROM monetization.orders o JOIN monetization.coupons c ON c.tenant_id=o.tenant_id AND c.code=o.coupon_code WHERE o.id=$1::uuid AND o.discount>0 ON CONFLICT(coupon_id,order_id)DO NOTHING RETURNING coupon_id)UPDATE monetization.coupons c SET used_count=used_count+1 FROM redemption r WHERE c.id=r.coupon_id`, [result.rows[0].order_id]);
    const order = await this.client.query<OrderRow>(`SELECT id,state,subtotal,discount,tax,total,currency,payment_intent_id,created_at FROM monetization.orders WHERE tenant_id=current_setting('app.current_tenant_id')::uuid AND idempotency_key=$1`, [input.key]);
    return { ...order.rows[0], itemCreated: Boolean(result.rowCount) };
  }

  async attachPayment(orderId: string, paymentIntentId: string) { const result = await this.client.query(`UPDATE monetization.orders SET payment_intent_id=$2::uuid,updated_at=clock_timestamp()WHERE id=$1::uuid AND state='pending'AND(payment_intent_id IS NULL OR payment_intent_id=$2::uuid)RETURNING id,state,total,currency,payment_intent_id`, [orderId, paymentIntentId]); return result.rows[0]; }

  async purchases(userId: string, limit: number) {
    const result = await this.client.query(`SELECT o.id,o.state,o.total,o.currency,o.created_at,jsonb_agg(jsonb_build_object('title',p.title,'kind',p.kind,'quantity',i.quantity))items FROM monetization.orders o JOIN monetization.order_items i ON i.order_id=o.id JOIN monetization.products p ON p.id=i.product_id WHERE o.user_id=$1::uuid GROUP BY o.id ORDER BY o.created_at DESC LIMIT $2`, [userId, limit]);
    return result.rows;
  }

  async entitlements(userId: string) {
    const result = await this.client.query(`SELECT e.id,p.code,p.title,p.kind,e.granted,e.consumed,(e.granted-e.consumed)remaining,e.starts_at,e.expires_at,e.state FROM monetization.entitlements e JOIN monetization.products p ON p.id=e.product_id WHERE e.user_id=$1::uuid AND e.state='active'AND(e.expires_at IS NULL OR e.expires_at>clock_timestamp())ORDER BY e.expires_at NULLS LAST`, [userId]);
    return result.rows;
  }

  async activate(orderId: string, paymentIntentId: string) {
    const result = await this.client.query(`WITH paid AS(UPDATE monetization.orders o SET state='fulfilled',paid_at=coalesce(paid_at,clock_timestamp()),fulfilled_at=clock_timestamp(),updated_at=clock_timestamp()FROM finance.payment_intents pi WHERE o.id=$1::uuid AND o.payment_intent_id=$2::uuid AND pi.id=$2::uuid AND pi.state='captured'AND o.state IN('pending','paid','fulfilled')RETURNING o.*),rights AS(INSERT INTO monetization.entitlements(tenant_id,user_id,business_id,order_item_id,product_id,granted,starts_at,expires_at,state)SELECT paid.tenant_id,paid.user_id,paid.business_id,i.id,i.product_id,p.quota,clock_timestamp(),CASE WHEN p.duration_minutes>0 THEN clock_timestamp()+make_interval(mins=>p.duration_minutes)END,'active'FROM paid JOIN monetization.order_items i ON i.order_id=paid.id JOIN monetization.products p ON p.id=i.product_id ON CONFLICT(order_item_id)DO NOTHING RETURNING id),subscriptions AS(INSERT INTO monetization.subscriptions(tenant_id,user_id,business_id,product_id,order_id,state,starts_at,current_period_end,renewal_key)SELECT paid.tenant_id,paid.user_id,paid.business_id,p.id,paid.id,'active',clock_timestamp(),clock_timestamp()+interval '1 month','renewal:'||paid.id FROM paid JOIN monetization.order_items i ON i.order_id=paid.id JOIN monetization.products p ON p.id=i.product_id WHERE p.kind='subscription'ON CONFLICT(order_id)DO NOTHING RETURNING id)INSERT INTO monetization.revenue_events(tenant_id,order_id,event_type,amount,journal_id,idempotency_key)SELECT paid.tenant_id,paid.id,'recognized',paid.total,(SELECT j.id FROM finance.journal_entries j WHERE j.tenant_id=paid.tenant_id AND j.reference_id=$2::text LIMIT 1),'revenue:'||paid.id FROM paid ON CONFLICT(tenant_id,idempotency_key)DO NOTHING RETURNING order_id`, [orderId, paymentIntentId]);
    const order = await this.client.query<OrderRow>(`SELECT id,state,subtotal,discount,tax,total,currency,payment_intent_id,created_at FROM monetization.orders WHERE id=$1::uuid`, [orderId]);
    return { ...order.rows[0], fulfilled: Boolean(result.rowCount) };
  }

  async metrics() {
    const result = await this.client.query(`SELECT(SELECT coalesce(sum(total),0)::bigint FROM monetization.orders WHERE state IN('paid','fulfilled','partially_fulfilled')AND paid_at>=date_trunc('day',clock_timestamp()))revenue_today,(SELECT count(*)::int FROM monetization.subscriptions WHERE state='active')active_subscriptions,(SELECT count(*)::int FROM monetization.promotions WHERE state='active'AND ends_at>clock_timestamp())active_promotions,(SELECT count(*)::int FROM monetization.orders WHERE state='pending'AND created_at<clock_timestamp()-interval '15 minutes')abandoned_orders`);
    return result.rows[0];
  }
}
