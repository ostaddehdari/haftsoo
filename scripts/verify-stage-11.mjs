import { existsSync, readFileSync } from "node:fs";

const required = [
  "apps/web/pages/s/[city]/[[category]].vue", "apps/web/components/CategorySidebar.vue", "apps/web/components/PostCard.vue",
  "apps/web/components/ListingSkeleton.vue", "apps/web/composables/useListingData.ts", "apps/web/test/listing-page.test.mjs",
  "deploy/web/index.html", "deploy/web/app.css", "deploy/web/app.js", "scripts/build-stage-11.sh",
  "docs/stage-11/routes.md", "docs/stage-11/category-sidebar.md", "docs/stage-11/post-card.md",
  "docs/stage-11/pagination-infinite-scroll.md", "docs/stage-11/sorting-view-mode.md", "docs/stage-11/responsive-layout.md",
  "docs/stage-11/badges-status.md", "docs/stage-11/skeleton-lazy-loading.md", "docs/stage-11/empty-no-result.md", "docs/stage-11/acceptance.md"
];
const fail = (message) => { throw new Error(`[stage-11] ${message}`); };
for (const file of required) if (!existsSync(file)) fail(`missing ${file}`);
const state = JSON.parse(readFileSync("project.state.json", "utf8"));
const design = JSON.parse(readFileSync("project.design.json", "utf8"));
const stage = state.completedStages?.find((entry) => entry.id === "S11");
const works = stage?.works ?? [];
if (state.currentStage !== "S11" || state.stageStatus !== "complete" || state.nextStage !== "S12") fail("project state must close S11 and point to S12");
if (stage?.status !== "complete" || works.length !== 10 || works.some((work) => work.status !== "complete")) fail("S11 must have exactly 10 completed works");
if (works.some((work, index) => work.id !== `S11-W${String(index + 1).padStart(2, "0")}`)) fail("S11 work identifiers are not sequential");
for (const work of works) if (!existsSync(work.evidence)) fail(`missing evidence for ${work.id}: ${work.evidence}`);
if (design.delivery.currentStage !== "S11" || design.engineering.version !== "0.11.0" || design.designSystem.version !== "0.4.0") fail("design manifest is not at S11");
const page = readFileSync("apps/web/pages/s/[city]/[[category]].vue", "utf8");
const staticApp = readFileSync("deploy/web/app.js", "utf8");
for (const marker of ["CategorySidebar", "PostCard", "ListingSkeleton", "IntersectionObserver", "pagination", "price-asc"]) if (!page.includes(marker)) fail(`Nuxt listing is missing ${marker}`);
for (const marker of ["renderListing", "IntersectionObserver", "haftsoo-list-view", "static-badge"]) if (!staticApp.includes(marker)) fail(`deploy listing is missing ${marker}`);
console.log("Stage 11 verified: 10 works, city/category routes, category tree, cards, pagination, infinite scroll, sorting, view modes and UI states.");
