<script setup lang="ts">
import { formatCount, type ListingCategory } from "~/composables/useListingData";

defineProps<{ categories: ListingCategory[]; selected?: string; city: string }>();
const emit = defineEmits<{ select: [slug?: string] }>();
</script>

<template>
  <nav class="category-sidebar" aria-label="دسته‌بندی آگهی‌ها">
    <div class="category-sidebar__title"><strong>دسته‌بندی‌ها</strong><button v-if="selected" type="button" @click="emit('select')">همه</button></div>
    <ul>
      <li v-for="category in categories" :key="category.slug">
        <button type="button" :class="{ active: selected === category.slug }" @click="emit('select', category.slug)">
          <span>{{ category.name }}</span><small>{{ formatCount(category.count) }}</small>
        </button>
        <ul v-if="category.children && (selected === category.slug || category.children.some((item) => item.slug === selected))" class="category-children">
          <li v-for="child in category.children" :key="child.slug"><button type="button" :class="{ active: selected === child.slug }" @click="emit('select', child.slug)"><span>{{ child.name }}</span><small>{{ formatCount(child.count) }}</small></button></li>
        </ul>
      </li>
    </ul>
  </nav>
</template>
