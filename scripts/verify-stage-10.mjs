import { existsSync, readFileSync } from "node:fs";

const required = [
  "apps/web/layouts/default.vue", "apps/web/components/AppHeader.vue", "apps/web/components/CitySelector.vue",
  "apps/web/components/AppFooter.vue", "apps/web/components/UiState.vue", "apps/web/composables/useSelectedCities.ts",
  "apps/web/composables/useTheme.ts", "apps/web/composables/useAnalytics.ts", "apps/web/pages/index.vue",
  "apps/web/test/public-shell.test.mjs", "deploy/web/index.html", "deploy/web/app.css", "deploy/web/app.js",
  "scripts/build-stage-10.sh", "docs/stage-10/ssr-layout.md", "docs/stage-10/header-navigation.md",
  "docs/stage-10/multi-city.md", "docs/stage-10/home-city-search.md", "docs/stage-10/popular-cities.md",
  "docs/stage-10/footer-trust.md", "docs/stage-10/themes.md", "docs/stage-10/ui-states.md",
  "docs/stage-10/seo-analytics.md", "docs/stage-10/acceptance.md"
];
const fail = (message) => { throw new Error(`[stage-10] ${message}`); };
for (const file of required) if (!existsSync(file)) fail(`missing ${file}`);
const state = JSON.parse(readFileSync("project.state.json", "utf8"));
const design = JSON.parse(readFileSync("project.design.json", "utf8"));
const stage = state.completedStages?.find((entry) => entry.id === "S10");
const works = stage?.works ?? [];
if (state.currentStage !== "S10" || state.stageStatus !== "complete" || state.nextStage !== "S11") fail("project state must close S10 and point to S11");
if (stage?.status !== "complete" || works.length !== 10 || works.some((work) => work.status !== "complete")) fail("S10 must have exactly 10 completed works");
if (works.some((work, index) => work.id !== `S10-W${String(index + 1).padStart(2, "0")}`)) fail("S10 work identifiers are not sequential");
for (const work of works) if (!existsSync(work.evidence)) fail(`missing evidence for ${work.id}: ${work.evidence}`);
if (design.delivery.currentStage !== "S10" || design.engineering.version !== "0.10.0" || design.designSystem.version !== "0.3.0") fail("design manifest is not at S10");
const page = readFileSync("apps/web/pages/index.vue", "utf8");
const staticShell = readFileSync("deploy/web/index.html", "utf8");
for (const marker of ["useSeoMeta", "application/ld+json", "شهرهای پربازدید"]) if (!page.includes(marker)) fail(`Nuxt home is missing ${marker}`);
for (const marker of ["popular-city-grid", "site-footer", "canonical", "apply-cities"]) if (!staticShell.includes(marker)) fail(`deploy shell is missing ${marker}`);
console.log("Stage 10 verified: 10 works, Nuxt SSR shell, multi-city home, themes, UI states, SEO, analytics and visual gate.");
