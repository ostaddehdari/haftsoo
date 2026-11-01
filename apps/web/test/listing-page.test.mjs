import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../pages/s/[city]/[[category]].vue", import.meta.url), "utf8");
const card = readFileSync(new URL("../components/PostCard.vue", import.meta.url), "utf8");
const staticPage = readFileSync(new URL("../../../deploy/web/index.html", import.meta.url), "utf8");
const staticApp = readFileSync(new URL("../../../deploy/web/app.js", import.meta.url), "utf8");

test("listing route supports city, category, sorting and view mode", () => {
  for (const marker of ["route.params.city", "route.params.category", "price-asc", "viewCookie", "CategorySidebar"]) assert.match(page, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal((page.match(/@select="selectCategory"/g) ?? []).length, 2);
});

test("listing exposes pagination, infinite loading and no-result state", () => {
  for (const marker of ["IntersectionObserver", "loadMore", "pagination", "ListingSkeleton", "UiState"]) assert.ok(page.includes(marker));
});

test("post card provides lazy thumbnails, badges and bookmark state", () => {
  assert.match(card, /loading="lazy"/);
  assert.match(card, /urgent.+featured.+business.+exchange/s);
  assert.match(card, /aria-pressed/);
});

test("installable shell mirrors stage eleven listing controls", () => {
  for (const marker of ["listing-categories", "listing-sort", "data-view-mode", "listing-skeleton", "listing-empty", "load-more"]) assert.ok(staticPage.includes(marker));
  for (const marker of ["renderListing", "IntersectionObserver", "price-asc", "haftsoo-list-view", "static-badge"]) assert.ok(staticApp.includes(marker));
});
