import { Buffer } from "node:buffer";

export type SearchSort = "relevance" | "newest" | "price-asc" | "price-desc";
export interface DynamicFilter { eq?: string | number | boolean; any?: Array<string | number>; gte?: number; lte?: number }
export interface SearchInput {
  query?: string;
  cityIds?: string[];
  districtIds?: string[];
  categorySlug?: string;
  filters?: Record<string, DynamicFilter>;
  sort?: SearchSort;
  cursor?: string;
  limit?: number;
}

export interface PostProjection {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  categorySlug: string;
  cityId: string;
  districtId?: string;
  price?: number;
  attributes: Record<string, unknown>;
  status: "active" | "sold" | "expired" | "moderating";
  publishedAt: string;
  updatedAt: string;
  location?: { lat: number; lon: number };
  thumbnailUrl?: string;
}

const arabicToPersian = new Map([
  ["ي", "ی"], ["ى", "ی"], ["ئ", "ی"], ["ك", "ک"], ["ة", "ه"], ["ۀ", "ه"], ["ؤ", "و"]
]);
const diacritics = /[\u064B-\u065F\u0670\u06D6-\u06ED]/gu;
const zeroWidth = /[\u200B-\u200D\u2060\uFEFF]/gu;

export function normalizePersian(value: string): string {
  return [...value.normalize("NFKC").replace(diacritics, "").replace(zeroWidth, " ")]
    .map((character) => arabicToPersian.get(character) ?? character)
    .join("")
    .replace(/[إأٱآ]/gu, "ا")
    .replace(/ـ/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("fa-IR");
}

export function validateSearchInput(input: SearchInput): SearchInput {
  const limit = Math.min(Math.max(Number(input.limit ?? 24), 1), 50);
  const query = normalizePersian(String(input.query ?? "")).slice(0, 160);
  const sort = input.sort ?? "relevance";
  if (!["relevance", "newest", "price-asc", "price-desc"].includes(sort)) throw new Error("unsupported search sort");
  for (const key of Object.keys(input.filters ?? {})) {
    if (!/^[a-z][a-z0-9_-]{1,63}$/.test(key)) throw new Error(`invalid filter key: ${key}`);
  }
  return { ...input, query, sort, limit };
}

export function encodeCursor(values: unknown[]): string {
  return Buffer.from(JSON.stringify(values), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string | undefined): unknown[] | undefined {
  if (!cursor) return undefined;
  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (!Array.isArray(value) || value.length > 4) throw new Error("shape");
    return value;
  } catch {
    throw new Error("invalid search cursor");
  }
}

function dynamicFilter(key: string, filter: DynamicFilter): Record<string, unknown>[] {
  const field = `attributes.${key}`;
  const clauses: Record<string, unknown>[] = [];
  if (filter.eq !== undefined) clauses.push({ term: { [field]: filter.eq } });
  if (filter.any?.length) clauses.push({ terms: { [field]: filter.any.slice(0, 100) } });
  if (filter.gte !== undefined || filter.lte !== undefined) clauses.push({ range: { [field]: { gte: filter.gte, lte: filter.lte } } });
  return clauses;
}

export function buildSearchQuery(raw: SearchInput, tenantId: string): Record<string, unknown> {
  const input = validateSearchInput(raw);
  const filters: Record<string, unknown>[] = [
    { term: { tenant_id: tenantId } },
    { term: { status: "active" } }
  ];
  if (input.cityIds?.length) filters.push({ terms: { city_id: input.cityIds.slice(0, 50) } });
  if (input.districtIds?.length) filters.push({ terms: { district_id: input.districtIds.slice(0, 100) } });
  if (input.categorySlug) filters.push({ term: { category_slug: input.categorySlug } });
  for (const [key, filter] of Object.entries(input.filters ?? {}).sort(([left], [right]) => left.localeCompare(right))) {
    filters.push(...dynamicFilter(key, filter));
  }
  const textQuery = input.query
    ? { multi_match: { query: input.query, fields: ["title^5", "title.shingle^3", "description", "category_title^2"], type: "best_fields", operator: "and", fuzziness: "AUTO:4,7" } }
    : { match_all: {} };
  const sort: unknown[] = input.sort === "price-asc" ? [{ price: "asc" }, { published_at: "desc" }, { _id: "asc" }]
    : input.sort === "price-desc" ? [{ price: "desc" }, { published_at: "desc" }, { _id: "asc" }]
      : input.sort === "newest" ? [{ published_at: "desc" }, { _id: "asc" }]
        : [{ _score: "desc" }, { published_at: "desc" }, { _id: "asc" }];
  return {
    size: input.limit,
    track_total_hits: true,
    search_after: decodeCursor(input.cursor),
    query: {
      function_score: {
        query: { bool: { must: [textQuery], filter: filters } },
        functions: [
          { gauss: { published_at: { origin: "now", scale: "14d", offset: "2d", decay: 0.5 } }, weight: 1.2 },
          { field_value_factor: { field: "quality_score", factor: 0.2, missing: 0.5 } }
        ],
        score_mode: "sum",
        boost_mode: "sum"
      }
    },
    sort,
    aggs: {
      categories: { terms: { field: "category_slug", size: 30 } },
      cities: { terms: { field: "city_id", size: 50 } },
      districts: { terms: { field: "district_id", size: 100 } }
    }
  };
}

export function buildSuggestionQuery(query: string, tenantId: string, limit = 8): Record<string, unknown> {
  return {
    size: Math.min(Math.max(limit, 1), 20),
    _source: ["title", "category_slug"],
    query: {
      bool: {
        filter: [{ term: { tenant_id: tenantId } }, { term: { status: "active" } }],
        should: [
          { match_phrase_prefix: { "title.autocomplete": { query: normalizePersian(query), boost: 4 } } },
          { match: { search_terms: { query: normalizePersian(query), fuzziness: "AUTO" } } }
        ],
        minimum_should_match: 1
      }
    },
    collapse: { field: "title.keyword" }
  };
}

export function projectPost(post: PostProjection): Record<string, unknown> {
  return {
    tenant_id: post.tenantId,
    title: normalizePersian(post.title),
    title_display: post.title,
    description: normalizePersian(post.description),
    category_slug: post.categorySlug,
    city_id: post.cityId,
    district_id: post.districtId,
    price: post.price,
    attributes: post.attributes,
    status: post.status,
    published_at: post.publishedAt,
    updated_at: post.updatedAt,
    location: post.location,
    thumbnail_url: post.thumbnailUrl,
    quality_score: 1
  };
}
