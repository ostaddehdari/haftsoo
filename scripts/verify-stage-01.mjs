import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const required = [
  "README.md", "project.design.json", "project.state.json", "architecture.json", "decisions.json", "risks.json",
  "ops/environments/production.example.json", "ops/nginx/haftsoo-location.conf.example",
  "docs/stage-01/product-baseline.md", "docs/stage-01/governance-raci.md", "docs/stage-01/domain-map.md",
  "docs/stage-01/legal-boundaries.md", "docs/stage-01/nfr-slo-capacity.md", "docs/adr/README.md",
  "docs/adr/0001-platform-stack.md", "docs/stage-01/risk-register.md", "docs/stage-01/epics-outcomes.md", "docs/stage-01/acceptance.md"
];

const failures = [];
for (const relative of required) if (!fs.existsSync(path.join(root, relative))) failures.push(`missing: ${relative}`);

const jsonFiles = ["project.design.json", "project.state.json", "architecture.json", "decisions.json", "risks.json", "ops/environments/production.example.json"];
for (const relative of jsonFiles) {
  try { JSON.parse(fs.readFileSync(path.join(root, relative), "utf8")); }
  catch (error) { failures.push(`invalid json: ${relative}: ${error.message}`); }
}

const state = JSON.parse(fs.readFileSync(path.join(root, "project.state.json"), "utf8"));
const stageOne = state.completedStages?.find((stage) => stage.id === "S01");
const stageOneWorks = stageOne?.works ?? (state.currentStage === "S01" ? state.works : []);
if (stageOneWorks.length !== 10) failures.push(`stage 1 must have 10 works, got ${stageOneWorks.length}`);
const expectedIds = Array.from({ length: 10 }, (_, i) => `S01-W${String(i + 1).padStart(2, "0")}`);
if (JSON.stringify(stageOneWorks.map((work) => work.id)) !== JSON.stringify(expectedIds)) failures.push("stage 1 work IDs are invalid or out of order");
for (const work of stageOneWorks) if (!fs.existsSync(path.join(root, work.evidence))) failures.push(`missing evidence for ${work.id}: ${work.evidence}`);

const design = JSON.parse(fs.readFileSync(path.join(root, "project.design.json"), "utf8"));
if (design.delivery.stageCount !== 40 || design.delivery.worksPerStage !== 10) failures.push("delivery plan must remain 40 stages x 10 works");
if (design.deploymentTarget.publicUrl !== "https://srun.ir/haftsoo/") failures.push("unexpected production public URL");
if (design.deploymentTarget.sshPort !== 2233) failures.push("unexpected production SSH port");
if (design.deploymentTarget.secretsStoredInRepository !== false) failures.push("repository secret policy must be false");

const secretPatterns = [
  /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
  /gh[pousr]_[A-Za-z0-9_]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /(?:password|passwd|secret|token)\s*[=:]\s*["'][^"']{8,}["']/i
];
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  if ([".git", "node_modules"].includes(entry.name)) return [];
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
for (const file of walk(root)) {
  const content = fs.readFileSync(file, "utf8");
  for (const pattern of secretPatterns) if (pattern.test(content)) failures.push(`possible secret pattern in ${path.relative(root, file)}`);
}

if (failures.length) {
  console.error("Stage 01 verification failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log(`Stage 01 verified: ${required.length} required artifacts, 10 historical works, JSON valid, deployment target valid, secret scan clean.`);
