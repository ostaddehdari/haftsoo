import { existsSync, readFileSync } from "node:fs";

const required = [
  "CODEOWNERS", ".editorconfig", ".nvmrc", ".tool-versions", "package-lock.json", "compose.dev.yaml",
  "apps/web/package.json", "apps/web/nuxt.config.ts", "apps/web/tsconfig.json", "apps/web/app.vue", "apps/web/Dockerfile",
  "apps/api/package.json", "apps/api/nest-cli.json", "apps/api/src/main.ts", "apps/api/Dockerfile",
  "services/chat/go.mod", "services/chat/cmd/server/main.go", "services/chat/internal/server/server_test.go", "services/chat/Dockerfile",
  "packages/contracts/package.json", "packages/contracts/src/index.ts",
  "scripts/lint.mjs", "scripts/format-check.mjs", "scripts/commitlint.mjs",
  "docs/stage-03/monorepo-ownership.md", "docs/stage-03/frontend-nuxt.md", "docs/stage-03/backend-nest.md",
  "docs/stage-03/chat-go.md", "docs/stage-03/contracts.md", "docs/stage-03/quality.md",
  "docs/stage-03/release-policy.md", "docs/stage-03/ci.md", "docs/stage-03/local-development.md", "docs/stage-03/acceptance.md"
];
const fail = (message) => { throw new Error(`[stage-03] ${message}`); };
const read = (file) => readFileSync(file, "utf8");
for (const file of required) if (!existsSync(file)) fail(`missing ${file}`);

const rootPackage = JSON.parse(read("package.json"));
const state = JSON.parse(read("project.state.json"));
const stage = state.completedStages?.find((entry) => entry.id === "S03");
const works = stage?.works ?? (state.currentStage === "S03" ? state.works : []);

if (!/^0\.[3-9]\./.test(rootPackage.version)) fail("root package version must not predate stage 3");
if (!rootPackage.workspaces?.includes("apps/*") || !rootPackage.workspaces?.includes("packages/*")) fail("npm workspaces are incomplete");
if (stage?.status !== "complete") fail("project state must retain completed S03 history");
if (works.length !== 10 || works.some((work) => work.status !== "complete")) fail("S03 must have exactly 10 completed works");
if (works.some((work, index) => work.id !== `S03-W${String(index + 1).padStart(2, "0")}`)) fail("S03 work identifiers are not sequential");
for (const work of works) if (!existsSync(work.evidence)) fail(`missing evidence for ${work.id}: ${work.evidence}`);

const webPackage = JSON.parse(read("apps/web/package.json"));
const apiPackage = JSON.parse(read("apps/api/package.json"));
if (webPackage.dependencies.nuxt !== "3.21.11") fail("Nuxt 3 must be pinned");
if (!apiPackage.dependencies["@nestjs/core"]) fail("NestJS core is not configured");
if (!read("services/chat/go.mod").includes("go 1.24")) fail("Go toolchain is not pinned");
if (!read("apps/web/nuxt.config.ts").includes("NUXT_APP_BASE_URL")) fail("Nuxt base path support is absent");
if (!read(".github/workflows/verify.yml").includes("go-version")) fail("CI does not verify Go");
if (!read(".github/workflows/verify.yml").includes("npm ci")) fail("CI dependency graph is not frozen");
if (!read("compose.dev.yaml").includes("services/chat/Dockerfile")) fail("local Compose does not build chat");

console.log(`Stage 03 verified: ${works.length} works, Nuxt/NestJS/Go scaffolds, contracts, quality gates and local Compose.`);
