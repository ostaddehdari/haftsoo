<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'امنیت و آسیب‌پذیری | هفت‌سو', robots: 'noindex,nofollow' })
const { findings, load, metrics, pending, scans } = useSecurityOperations()
onMounted(load)
</script>

<template>
  <main id="admin-main" class="admin-dashboard security-dashboard">
    <header class="admin-page-heading">
      <div><p class="eyebrow">AppSec و زنجیره تأمین</p><h1>امنیت و آسیب‌پذیری</h1><p>دارایی‌ها، اسکن‌ها، SBOM، Provenance، SLA رفع و آزمون نفوذ مجاز.</p></div>
      <span class="admin-environment"><i />Release Gate · فعال</span>
    </header>
    <UiState v-if="pending" kind="loading" title="در حال دریافت وضعیت امنیت" description="یافته‌ها، اسکن‌ها و پوشش زنجیره تأمین به‌روزرسانی می‌شوند." />
    <template v-else>
      <SecurityMetricGrid :metrics="metrics" />
      <div class="security-grid">
        <VulnerabilityQueue :items="findings" />
        <SupplyChainCoverage :sbom="metrics.sbom_coverage_bps" :provenance="metrics.provenance_coverage_bps" />
        <SecurityScanPanel :items="scans" />
      </div>
    </template>
  </main>
</template>
