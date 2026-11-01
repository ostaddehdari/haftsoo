import { Injectable } from "@nestjs/common";

@Injectable()
export class OpenSearchClient {
  private readonly baseUrl = (process.env.OPENSEARCH_URL ?? "http://127.0.0.1:9200").replace(/\/$/, "");
  readonly alias = process.env.OPENSEARCH_POSTS_ALIAS ?? "haftsoo-posts-read";

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(process.env.OPENSEARCH_TIMEOUT_MS ?? 2500));
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { "content-type": "application/json", ...init.headers },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`OpenSearch ${response.status} ${path}`);
      return await response.json() as T;
    } finally {
      clearTimeout(timer);
    }
  }

  search<T>(body: Record<string, unknown>): Promise<T> {
    return this.request<T>(`/${this.alias}/_search`, { method: "POST", body: JSON.stringify(body) });
  }

  async bulk(ndjson: string): Promise<{ errors: boolean; items: unknown[] }> {
    return this.request("/_bulk", { method: "POST", body: ndjson, headers: { "content-type": "application/x-ndjson" } });
  }
}
