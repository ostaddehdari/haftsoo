export const PUBLIC_POST_TOKEN = /^[A-Za-z0-9_-]{8,32}$/;
export const POST_REPORT_REASONS = ["fraud", "duplicate", "wrong_category", "sold", "prohibited", "other"] as const;
export type PostReportReason = (typeof POST_REPORT_REASONS)[number];

export function assertPublicPostToken(token: string): void {
  if (!PUBLIC_POST_TOKEN.test(token)) throw new Error("post_token_invalid");
}

export function canonicalPostUrl(input: { baseUrl: string; slug: string; token: string }): string {
  assertPublicPostToken(input.token);
  const slug = input.slug.trim().replace(/[^\p{L}\p{N}-]+/gu, "-").replace(/^-+|-+$/g, "") || "post";
  return `${input.baseUrl.replace(/\/$/, "")}/v/${encodeURIComponent(slug)}/${input.token}`;
}

export function approximateLocation(latitude: number | null, longitude: number | null, precisionMeters = 700) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const step = Math.max(precisionMeters, 250) / 111_320;
  return {
    latitude: Number((Math.round(Number(latitude) / step) * step).toFixed(5)),
    longitude: Number((Math.round(Number(longitude) / step) * step).toFixed(5)),
    radiusMeters: Math.max(precisionMeters, 250)
  };
}

export function publicContactPolicy(contact: Record<string, unknown>, privacy: Record<string, unknown>) {
  const phone = typeof contact.phone === "string" ? contact.phone.replace(/\D/g, "") : "";
  return {
    canRevealPhone: Boolean(privacy.phoneVisible && /^09\d{9}$/.test(phone)),
    chatEnabled: privacy.chatEnabled !== false,
    safeCallEnabled: privacy.safeCallEnabled === true
  };
}

export function revealedContact(contact: Record<string, unknown>, privacy: Record<string, unknown>) {
  const policy = publicContactPolicy(contact, privacy);
  if (!policy.canRevealPhone) throw new Error("contact_phone_unavailable");
  return { phone: String(contact.phone).replace(/\D/g, ""), safeCallEnabled: policy.safeCallEnabled };
}

export function normalizePrivateNote(value: string): string {
  const note = value.replace(/\s+/g, " ").trim();
  if (note.length > 500) throw new Error("note_too_long");
  return note;
}

export function assertReportReason(reason: string): asserts reason is PostReportReason {
  if (!(POST_REPORT_REASONS as readonly string[]).includes(reason)) throw new Error("report_reason_invalid");
}

export function productStructuredData(input: { canonical: string; title: string; description: string; price?: number | null; currency?: string; images: string[]; city: string; availability: "InStock" | "OutOfStock" }) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.title,
    description: input.description.slice(0, 500),
    url: input.canonical,
    image: input.images,
    areaServed: { "@type": "City", name: input.city },
    offers: input.price == null ? undefined : {
      "@type": "Offer",
      priceCurrency: input.currency ?? "IRR",
      price: input.price,
      availability: `https://schema.org/${input.availability}`,
      url: input.canonical
    }
  };
}
