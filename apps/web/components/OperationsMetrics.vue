<script setup lang="ts">defineProps<{metrics:{backlog:number;breached:number;claimed:number;escalated:number;sla_compliance:number}}>();</script>
<template><section class="operations-metrics" aria-label="شاخص‌های عملیات"><article><strong>{{metrics.backlog}}</strong><span>صف فعال</span></article><article><strong>{{metrics.claimed}}</strong><span>در دست بررسی</span></article><article><strong>{{metrics.breached}}</strong><span>نقض SLA</span></article><article><strong>{{metrics.sla_compliance}}٪</strong><span>رعایت SLA</span></article></section></template>

