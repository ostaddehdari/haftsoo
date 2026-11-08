<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'حریم خصوصی و انطباق | هفت‌سو', robots: 'noindex,nofollow' })
const { load, metrics, pending, processors, requests, retention } = usePrivacyOperations()
onMounted(load)
</script>
<template><main id="admin-main" class="admin-dashboard privacy-dashboard"><header class="admin-page-heading"><div><p class="eyebrow">PrivacyOps و انطباق</p><h1>حریم خصوصی و حقوق داده</h1><p>فهرست داده، مبنای قانونی، نگهداری، درخواست‌های کاربران، پردازشگرها و رخدادهای نقض.</p></div><span class="admin-environment"><i />Privacy by default · فعال</span></header><UiState v-if="pending" kind="loading" title="در حال دریافت وضعیت حریم خصوصی" description="درخواست‌ها، قوانین و پردازشگرها به‌روزرسانی می‌شوند." /><template v-else><PrivacyMetricGrid :metrics="metrics" /><div class="privacy-grid"><DataRightsQueue :items="requests" /><RetentionCoveragePanel :coverage="metrics.retention_coverage_bps" :items="retention" /><ProcessorRegisterPanel :items="processors" /></div></template></main></template>
