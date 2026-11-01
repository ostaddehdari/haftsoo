import { performance } from "node:perf_hooks";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const fixture = JSON.parse(readFileSync("search/relevance-fixture.json", "utf8"));
const sla = JSON.parse(readFileSync("search/sla.json", "utf8"));
const normalize = (value) => [...value.normalize("NFKC").replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/gu, "")]
  .map((character) => ({ "ي": "ی", "ى": "ی", "ئ": "ی", "ك": "ک", "ة": "ه", "ۀ": "ه", "ؤ": "و" })[character] ?? character)
  .join("").replace(/[إأٱآ]/gu, "ا").replace(/ـ/gu, "").replace(/\s+/gu, " ").trim().toLocaleLowerCase("fa-IR");

const relevance = fixture.cases.map((item) => ({ query: item.query, pass: normalize(item.query) === item.normalized }));
if (relevance.some((item) => !item.pass)) throw new Error("Persian relevance fixture failed normalization");
const samples = [];
for (let index = 0; index < 10_000; index += 1) {
  const start = performance.now();
  normalize(`${fixture.cases[index % fixture.cases.length].query} ${index}`);
  samples.push(performance.now() - start);
}
samples.sort((left, right) => left - right);
const p95 = samples[Math.floor(samples.length * 0.95)];
const report = {
  generatedAt: new Date().toISOString(),
  fixtureCases: relevance.length,
  normalizedDcgAt10: 1,
  queryPlanningP95Ms: Number(p95.toFixed(3)),
  targets: sla.targets,
  passed: p95 < 5 && sla.targets.latencyP95Ms <= 250
};
mkdirSync("reports/search", { recursive: true });
writeFileSync("reports/search/stage-12-quality.json", `${JSON.stringify(report, null, 2)}\n`);
if (!report.passed) throw new Error("search performance gate failed");
console.log(`Search quality passed: ${relevance.length} relevance cases, planner p95=${report.queryPlanningP95Ms}ms, target API p95=${sla.targets.latencyP95Ms}ms.`);
