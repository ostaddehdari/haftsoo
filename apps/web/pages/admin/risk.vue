<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'مدیریت ریسک | هفت‌سو', robots: 'noindex,nofollow' })
const { cases, claim, decide, load, message, overview, pending, select, selected } = useRiskOperations()

function selectCase(id: string) {
  const item = cases.value.find((candidate) => candidate.id === id)
  if (item) select(item)
}

function claimSelected() {
  if (selected.value) claim(selected.value)
}

onMounted(load)
</script>

<template>
  <main id="admin-main" class="admin-dashboard risk-dashboard">
    <header class="admin-page-heading">
      <div>
        <p class="eyebrow">اعتماد و ایمنی</p>
        <h1>ضدتقلب و مدیریت ریسک</h1>
        <p>تصمیم‌های توضیح‌پذیر با ترکیب قواعد، سرعت رفتار، دستگاه، شبکه حساب‌ها و بازبینی انسانی.</p>
      </div>
      <span class="admin-environment"><i />موتور ریسک · فعال</span>
    </header>
    <UiState v-if="pending" kind="loading" title="در حال ارزیابی ریسک" description="سیگنال‌ها و صف بررسی به‌روزرسانی می‌شوند." />
    <template v-else>
      <RiskMetricGrid :metrics="overview" />
      <p v-if="message" class="admin-message" role="status">{{ message }}</p>
      <div class="risk-dashboard-grid">
        <RiskCaseQueue :items="cases" :selected="selected?.id" @select="selectCase" />
        <RiskCaseWorkspace :item="selected" @claim="claimSelected" @decide="decide" />
      </div>
    </template>
  </main>
</template>
