<script setup lang="ts">
defineProps<{ metrics: Record<string, number | string | null> }>();
const fa = (value: unknown) => Number(value || 0).toLocaleString('fa-IR');
</script>
<template><section class="quality-metrics" aria-label="شاخص‌های کیفیت"><article><span>نرخ موفقیت</span><strong>{{ fa(Number(metrics.pass_rate_bps||0)/100) }}٪</strong><small>تمام Suiteها</small></article><article><span>نقص بحرانی</span><strong>{{ fa(metrics.critical_defects) }}</strong><small>Gate انتشار</small></article><article><span>یافته جدی WCAG</span><strong>{{ fa(metrics.serious_a11y) }}</strong><small>WCAG 2.2 AA</small></article><article><span>تست Flaky</span><strong>{{ fa(metrics.flaky_tests) }}</strong><small>قرنطینه موقت</small></article></section></template>
