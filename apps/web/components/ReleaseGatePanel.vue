<script setup lang="ts">
type Gate = { id: string; revision: string; environment: string; decision: string; reasons: string[]; decided_at: string };
defineProps<{ items: Gate[] }>();
</script>
<template><section class="admin-panel"><header><div><h2>دروازه انتشار</h2><p>تصمیم‌های تغییرناپذیر مبتنی بر شواهد</p></div></header><div v-if="items.length" class="quality-gate-list"><article v-for="item in items" :key="item.id"><div><b>{{ item.revision.slice(0,8) }} · {{ item.environment }}</b><small>{{ item.reasons.length ? item.reasons.join('، ') : 'همه کنترل‌ها موفق' }}</small></div><span class="quality-status">{{ item.decision }}</span></article></div><UiState v-else kind="empty" title="تصمیمی ثبت نشده" description="Release Gate پس از تکمیل همه کنترل‌ها تصمیم می‌گیرد." /></section></template>
