import { readFileSync } from "node:fs";

const baseUrl = (process.env.OPENSEARCH_URL ?? "http://127.0.0.1:9200").replace(/\/$/, "");
const template = JSON.parse(readFileSync("search/opensearch/posts-v1.json", "utf8"));
async function request(path, method, body) {
  const response = await fetch(`${baseUrl}${path}`, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok && response.status !== 404) throw new Error(`OpenSearch ${response.status} ${method} ${path}: ${await response.text()}`);
  return response;
}

await request("/_index_template/haftsoo-posts-v1", "PUT", template);
const alias = await request("/_alias/haftsoo-posts-read", "GET");
if (alias.status === 404) await request("/haftsoo-posts-v1-000001", "PUT");
console.log("OpenSearch bootstrap completed: posts-v1 template and read/write aliases are ready.");
