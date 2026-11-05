import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../../../deploy/web/index.html", import.meta.url), "utf8");
const js = readFileSync(new URL("../../../deploy/web/app.js", import.meta.url), "utf8");
const header = html.match(/<header class="app-header">[\s\S]*?<\/header>/)?.[0] ?? "";

test("public header excludes staff and finance navigation", () => {
  for (const label of ["بررسی محتوا", "عملیات", "CRM", "مالی", "درآمدزایی"]) assert.equal(header.includes(label), false, label);
  for (const label of ["دسته‌ها", "چت", "ورود", "ثبت آگهی"]) assert.equal(header.includes(label), true, label);
});

test("installable listing owns all user-facing filters", () => {
  for (const id of ["price-min", "price-max", "photo-only", "urgent-only", "mobile-price-min", "mobile-urgent-only"]) assert.match(html, new RegExp(`id="${id}"`));
  for (const marker of ["subcategory===listingState.category", "listingState.minPrice", "listingState.maxPrice", "listingState.photoOnly", "listingState.urgentOnly", "filterHref"]) assert.ok(js.includes(marker), marker);
});
