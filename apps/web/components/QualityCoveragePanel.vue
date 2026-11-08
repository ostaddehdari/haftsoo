<script setup lang="ts">
defineProps<{ browserCoverage: number; seriousA11y: number }>();
const percent = (value: number) => Math.round(Number(value || 0) / 100);
</script>
<template><section class="admin-panel quality-coverage"><header><div><h2>پوشش اجباری</h2><p>مرورگر و دسترس‌پذیری</p></div></header><label>ماتریس مرورگر <progress :value="percent(browserCoverage)" max="100" /> {{ percent(browserCoverage).toLocaleString('fa-IR') }}٪</label><div><b>WCAG 2.2 AA</b><p>{{ seriousA11y ? `${seriousA11y.toLocaleString('fa-IR')} یافته جدی باز` : 'یافته Critical/Serious باز نیست' }}</p></div><ul><li>Chromium، Firefox و WebKit</li><li>Mobile Chrome و Mobile Safari</li><li>Keyboard، Reduced Motion و RTL</li></ul></section></template>
