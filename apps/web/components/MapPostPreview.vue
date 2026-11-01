<script setup lang="ts">
import type { ListingPost } from "~/composables/useListingData";
defineProps<{ post: ListingPost }>();
defineEmits<{ close: [] }>();
</script>

<template>
  <article class="map-post-preview" aria-live="polite">
    <button type="button" class="map-preview-close" aria-label="بستن پیش‌نمایش" @click="$emit('close')">×</button>
    <img v-if="post.thumbnail" :src="post.thumbnail" :alt="post.title" loading="lazy">
    <div class="map-preview-copy"><strong>{{ post.title }}</strong><span>{{ post.priceLabel }}</span><small>{{ post.district }} · {{ post.publishedLabel }}</small></div>
  </article>
</template>
