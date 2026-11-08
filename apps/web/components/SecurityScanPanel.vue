<script setup lang="ts">
defineProps<{
  items: Array<{
    id: string
    scanner: string
    scope: string
    state: string
    findings_count: number
    critical_count: number
    high_count: number
  }>
}>()
</script>

<template>
  <section class="security-panel">
    <header><h2>آخرین اسکن‌ها</h2><p>SAST، SCA، Secret، Container، IaC و DAST</p></header>
    <article v-for="item in items" :key="item.id" class="security-finding">
      <div><b>{{ item.scanner }} · {{ item.scope }}</b><small>{{ item.findings_count }} یافته · {{ item.critical_count }} بحرانی · {{ item.high_count }} بالا</small></div>
      <span>{{ item.state }}</span>
    </article>
  </section>
</template>
