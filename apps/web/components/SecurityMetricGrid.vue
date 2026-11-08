<script setup lang="ts">
defineProps<{
  metrics: {
    assets_total: number
    critical_open: number
    high_open: number
    known_exploited_open: number
    overdue_open: number
    sbom_coverage_bps: number
    provenance_coverage_bps: number
  }
}>()
</script>

<template>
  <section class="security-kpis" aria-label="شاخص‌های امنیت">
    <article><span>دارایی‌های پوشش‌داده‌شده</span><strong>{{ metrics.assets_total }}</strong><small>Repository، Image و Service</small></article>
    <article><span>بحرانی باز</span><strong>{{ metrics.critical_open }}</strong><small>Release Gate فعال</small></article>
    <article><span>KEV باز</span><strong>{{ metrics.known_exploited_open }}</strong><small>SLA چهار ساعته</small></article>
    <article><span>سررسید گذشته</span><strong>{{ metrics.overdue_open }}</strong><small>Escalation خودکار</small></article>
  </section>
</template>
