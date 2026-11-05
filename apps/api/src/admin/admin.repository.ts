import type { SqlClient } from "../database/database-core";

export class AdminRepository {
  constructor(private readonly client: SqlClient) {}

  async overview() {
    const result = await this.client.query(`SELECT m.metrics,m.bucket_at,
      (SELECT count(*)::int FROM admin.alerts WHERE state IN('open','acknowledged')) open_alerts,
      (SELECT count(*)::int FROM admin.service_health WHERE status='down') down_services,
      (SELECT count(*)::int FROM admin.service_health WHERE status='degraded') degraded_services
      FROM admin.metric_snapshots m ORDER BY m.bucket_at DESC LIMIT 1`);
    return result.rows[0] ?? { metrics: {}, open_alerts: 0, down_services: 0, degraded_services: 0 };
  }

  async services() {
    return (await this.client.query(`SELECT service,status,latency_ms,availability_bps,version,checked_at,details FROM admin.service_health ORDER BY service`)).rows;
  }

  async alerts(limit = 50) {
    return (await this.client.query(`SELECT id,severity,source,title,description,state,first_seen_at,last_seen_at,occurrence_count,acknowledged_by,acknowledged_at FROM admin.alerts ORDER BY CASE severity WHEN'critical'THEN 0 WHEN'warning'THEN 1 ELSE 2 END,last_seen_at DESC LIMIT $1`, [limit])).rows;
  }

  async acknowledge(alertId: string, actorId: string, note: string) {
    const result = await this.client.query(`UPDATE admin.alerts SET state='acknowledged',acknowledged_by=$2::uuid,acknowledged_at=clock_timestamp(),resolution_note=$3,updated_at=clock_timestamp() WHERE id=$1::uuid AND state='open' RETURNING id,state,acknowledged_at`, [alertId, actorId, note]);
    return result.rows[0];
  }

  async configurations() {
    return (await this.client.query(`SELECT key,environment,value,version,checksum,published_at,published_by FROM admin.configurations ORDER BY environment,key`)).rows;
  }

  async proposeConfiguration(input: { key: string; environment: string; value: Record<string, unknown>; reason: string; checksum: string; actorId: string }) {
    const result = await this.client.query(`INSERT INTO admin.change_requests(tenant_id,kind,resource_key,environment,proposal,reason,checksum,proposed_by,state) VALUES(current_setting('app.current_tenant_id')::uuid,'configuration',$1,$2,$3::jsonb,$4,$5,$6::uuid,'pending') RETURNING id,resource_key,environment,proposal,reason,checksum,state,created_at`, [input.key, input.environment, JSON.stringify(input.value), input.reason, input.checksum, input.actorId]);
    return result.rows[0];
  }

  async approveConfiguration(requestId: string, approverId: string) {
    const result = await this.client.query(`WITH approved AS(
      UPDATE admin.change_requests SET state='approved',approved_by=$2::uuid,approved_at=clock_timestamp(),updated_at=clock_timestamp()
      WHERE id=$1::uuid AND state='pending' AND proposed_by<>$2::uuid RETURNING *),
    published AS(INSERT INTO admin.configurations(tenant_id,key,environment,value,version,checksum,published_by,published_at)
      SELECT tenant_id,resource_key,environment,proposal,1,checksum,$2::uuid,clock_timestamp() FROM approved
      ON CONFLICT(tenant_id,environment,key)DO UPDATE SET value=EXCLUDED.value,version=admin.configurations.version+1,checksum=EXCLUDED.checksum,published_by=EXCLUDED.published_by,published_at=EXCLUDED.published_at,updated_at=clock_timestamp()
      RETURNING *),
    history AS(INSERT INTO admin.configuration_versions(tenant_id,configuration_id,version,value,checksum,change_request_id,published_by)
      SELECT tenant_id,id,version,value,checksum,$1::uuid,$2::uuid FROM published RETURNING configuration_id)
    SELECT p.key,p.environment,p.value,p.version,p.checksum,p.published_at FROM published p JOIN history h ON h.configuration_id=p.id`, [requestId, approverId]);
    return result.rows[0];
  }

  async createReport(input: { kind: string; format: string; from: Date; to: Date; columns: string[]; actorId: string }) {
    const result = await this.client.query(`INSERT INTO admin.report_jobs(tenant_id,kind,format,range_from,range_to,columns,requested_by,state) VALUES(current_setting('app.current_tenant_id')::uuid,$1,$2,$3,$4,$5::jsonb,$6::uuid,'queued') RETURNING id,kind,format,range_from,range_to,state,created_at`, [input.kind, input.format, input.from, input.to, JSON.stringify(input.columns), input.actorId]);
    return result.rows[0];
  }

  async report(reportId: string) {
    return (await this.client.query(`SELECT id,kind,format,range_from,range_to,state,progress,object_key,error_code,created_at,started_at,completed_at FROM admin.report_jobs WHERE id=$1::uuid`, [reportId])).rows[0];
  }

  async audit(limit = 100) {
    return (await this.client.query(`SELECT id,actor_id,action,resource_type,resource_id,outcome,metadata,request_id,occurred_at FROM admin.audit_log ORDER BY occurred_at DESC LIMIT $1`, [limit])).rows;
  }
}
