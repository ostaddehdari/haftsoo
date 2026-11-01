<script setup lang="ts">
import type { ListingPost } from "~/composables/useListingData";

const props = defineProps<{ post: ListingPost; view?: "grid" | "list" }>();
const bookmarked = ref(false);
const badgeLabels = { urgent: "فوری", featured: "ویژه", business: "فروشگاه", exchange: "معاوضه" } as const;
</script>

<template>
  <article class="listing-card" :class="`listing-card--${props.view ?? 'grid'}`">
    <NuxtLink class="listing-card__media" :to="`/v/${post.listingId}`" :aria-label="post.title">
      <img v-if="post.thumbnail" :src="post.thumbnail" width="480" height="360" loading="lazy" decoding="async" :alt="`تصویر ${post.title}`">
      <span v-else class="thumbnail-empty" role="img" aria-label="این آگهی تصویر ندارد">بدون تصویر</span>
      <span v-if="post.badges.includes('featured')" class="promoted-marker">ویژه</span>
    </NuxtLink>
    <div class="listing-card__body">
      <div class="listing-card__badges" aria-label="وضعیت آگهی"><span v-for="badge in post.badges.filter((item) => item !== 'featured')" :key="badge" :class="`badge badge--${badge}`">{{ badgeLabels[badge] }}</span></div>
      <h2><NuxtLink :to="`/v/${post.listingId}`">{{ post.title }}</NuxtLink></h2>
      <p class="listing-card__price">{{ post.priceLabel }}</p>
      <p class="listing-card__meta">{{ post.district }}، {{ post.publishedLabel }}</p>
    </div>
    <button class="bookmark-card" type="button" :class="{ active: bookmarked }" :aria-pressed="bookmarked" :aria-label="bookmarked ? 'حذف از نشان‌ها' : 'افزودن به نشان‌ها'" @click="bookmarked = !bookmarked">{{ bookmarked ? "★" : "☆" }}</button>
  </article>
</template>
