<script setup lang="ts">
const { bucket, items, loading, error, historyFor, load, action } = useMyPosts();
useHead({ title: "آگهی‌های من — هفت‌سو", meta: [{ name: "robots", content: "noindex,nofollow" }] });
</script>
<template>
  <main class="my-posts-page content-container">
    <header class="my-posts-title"><div><p class="eyebrow">هفت‌سوی من</p><h1>آگهی‌های من</h1><p>وضعیت، ویرایش و چرخه انتشار همه آگهی‌ها را از اینجا مدیریت کنید.</p></div><NuxtLink class="button button-primary" to="/new">ثبت آگهی جدید</NuxtLink></header>
    <nav class="my-post-tabs" aria-label="وضعیت آگهی‌ها"><button v-for="tab in myPostBuckets" :key="tab.key" type="button" :aria-current="bucket === tab.key ? 'page' : undefined" @click="load(tab.key)">{{ tab.label }}</button></nav>
    <p v-if="error" class="inline-error" role="alert">{{ error }}</p>
    <ListingSkeleton v-if="loading" />
    <div v-else-if="items.length" class="my-posts-list"><MyPostCard v-for="item in items" :key="item.id" :item="item" @action="action" @history="historyFor = $event" /></div>
    <UiState v-else kind="empty" title="آگهی‌ای در این بخش نیست" description="وقتی وضعیت آگهی تغییر کند، این فهرست خودکار به‌روز می‌شود." />
    <div v-if="historyFor" class="dialog-backdrop" @click.self="historyFor = null"><PostHistoryPanel :post-id="historyFor" @close="historyFor = null" /></div>
  </main>
</template>
