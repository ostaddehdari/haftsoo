<script setup lang="ts">
definePageMeta({ layout: 'admin' });
useSeoMeta({ title: 'تضمین کیفیت | هفت‌سو', robots: 'noindex,nofollow' });
const { gates, load, metrics, pending, runs, unavailable } = useQualityOperations();
onMounted(load);
</script>
<template><main id="admin-main" class="admin-dashboard quality-dashboard"><header class="admin-page-heading"><div><p class="eyebrow">Release confidence</p><h1>تضمین کیفیت و سازگاری</h1><p>سفرهای حیاتی، WCAG 2.2 AA، مرورگرها، موبایل، Visual Regression و Flaky Test.</p></div><span class="admin-environment"><i />Quality Gate · مسدود تا اثبات</span></header><UiState v-if="pending" kind="loading" title="در حال دریافت وضعیت کیفیت" description="نتایج تست‌ها و دروازه انتشار دریافت می‌شوند."/><UiState v-else-if="unavailable" kind="error" title="سرویس کیفیت در دسترس نیست" description="داده نمونه نمایش داده نمی‌شود؛ اتصال API را بررسی کنید."/><template v-else><QualityMetricGrid :metrics="metrics"/><div class="quality-grid"><QualityRunList :items="runs"/><QualityCoveragePanel :browser-coverage="metrics.browser_coverage_bps" :serious-a11y="metrics.serious_a11y"/><ReleaseGatePanel :items="gates"/></div></template></main></template>
