<script setup lang="ts">
import type { MyPostItem } from "~/composables/useMyPosts";
const props = defineProps<{ item: MyPostItem }>();
const emit = defineEmits<{ action: [item: MyPostItem, action: "pause" | "resume" | "renew" | "republish" | "archive" | "delete"]; history: [id: string] }>();
const date = computed(() => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(props.item.updatedAt)));
</script>
<template>
  <article class="my-post-card">
    <div class="my-post-thumb" aria-hidden="true">۷</div>
    <div class="my-post-copy">
      <div class="my-post-heading"><h2>{{ item.title }}</h2><PostStatusChip :status="item.status" /></div>
      <p class="my-post-meta">آخرین تغییر {{ date }} · نسخه {{ item.version.toLocaleString("fa-IR") }}</p>
      <aside v-if="item.moderation?.message" class="moderation-message"><strong>پیام بررسی محتوا</strong><span>{{ item.moderation.message }}</span></aside>
      <div class="my-post-actions">
        <NuxtLink v-if="item.kind === 'draft'" class="button button-primary" :to="`/new?draft=${item.id}`">ادامه ثبت</NuxtLink>
        <button v-else-if="item.status === 'published'" class="button button-secondary" type="button" @click="emit('action', item, 'pause')">توقف موقت</button>
        <button v-else-if="item.status === 'paused'" class="button button-primary" type="button" @click="emit('action', item, 'resume')">فعال‌کردن</button>
        <button v-if="['expired','rejected','needs_changes'].includes(item.status)" class="button button-primary" type="button" @click="emit('action', item, 'republish')">اصلاح و انتشار دوباره</button>
        <button v-if="item.kind === 'post'" class="text-button" type="button" @click="emit('history', item.id)">تاریخچه نسخه‌ها</button>
        <button v-if="item.kind === 'post' && !['archived','deleted'].includes(item.status)" class="text-button" type="button" @click="emit('action', item, 'archive')">بایگانی</button>
      </div>
    </div>
  </article>
</template>
