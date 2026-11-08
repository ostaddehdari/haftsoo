<script setup lang="ts">
defineProps<{ coverage: number; items: Array<{ rule_key: string; domain: string; retention_days: number; action: string; active: boolean }> }>()
</script>
<template><section class="privacy-panel privacy-coverage"><header><h2>نگهداری و پاک‌سازی</h2><p>Retention، Legal Hold و مدرک حذف</p></header><label>پوشش قوانین <progress :value="coverage" max="10000" /> {{ Math.round(coverage / 100) }}٪</label><ul><li v-for="item in items.slice(0,5)" :key="item.rule_key">{{ item.domain }} · {{ item.retention_days }} روز · {{ item.action }}</li></ul></section></template>
