<script setup lang="ts">
type Run = { id: string; suite: string; revision: string; environment: string; status: string; tests_total: number; tests_passed: number; tests_failed: number };
defineProps<{ items: Run[] }>();
</script>
<template><section class="admin-panel"><header><div><h2>اجرای تست‌ها</h2><p>Revision، محیط، Suite و نتیجه واقعی</p></div></header><div v-if="items.length" class="quality-run-list"><article v-for="item in items" :key="item.id"><div><b>{{ item.suite }} · {{ item.environment }}</b><small>{{ item.revision.slice(0,8) }} · {{ item.tests_passed }}/{{ item.tests_total }} موفق</small></div><span class="quality-status">{{ item.status }}</span></article></div><UiState v-else kind="empty" title="اجرایی ثبت نشده" description="پس از اجرای CI نتیجه مرورگرها اینجا نمایش داده می‌شود." /></section></template>
