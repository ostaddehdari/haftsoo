import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(file, "utf8");

test("public shell includes SSR layout, navigation, city selection and footer", () => {
  const layout = read("layouts/default.vue");
  const header = read("components/AppHeader.vue");
  const selector = read("components/CitySelector.vue");
  const footer = read("components/AppFooter.vue");
  assert.match(layout, /AppHeader/);
  assert.match(layout, /AppFooter/);
  assert.match(header, /aria-label="ناوبری اصلی"/);
  assert.match(selector, /تا ۱۰ شهر/);
  assert.match(selector, /aria-modal="true"/);
  assert.match(footer, /نشان‌های اعتماد/);
});

test("home exposes popular cities, theme, UI states, SEO and privacy-aware analytics", () => {
  const page = read("pages/index.vue");
  const theme = read("composables/useTheme.ts");
  const analytics = read("composables/useAnalytics.ts");
  const states = read("components/UiState.vue");
  for (const marker of ["useSeoMeta", "application/ld\\+json", "شهرهای پربازدید", "category-grid"]) assert.match(page, new RegExp(marker));
  assert.match(theme, /prefers-color-scheme/);
  assert.match(analytics, /globalPrivacyControl/);
  for (const marker of ["loading", "error", "empty", "aria-live"]) assert.match(states, new RegExp(marker));
});

test("deployable static shell carries the same stage ten capabilities", () => {
  const html = read("../../deploy/web/index.html");
  const script = read("../../deploy/web/app.js");
  for (const marker of ["canonical", "application/ld\\+json", "popular-city-grid", "site-footer", "apply-cities"]) assert.match(html, new RegExp(marker));
  for (const marker of ["haftsoo-cities", "city_selection", "globalPrivacyControl", "renderPopularCities"]) assert.match(script, new RegExp(marker));
});
