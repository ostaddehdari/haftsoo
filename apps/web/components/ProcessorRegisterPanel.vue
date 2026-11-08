<script setup lang="ts">
defineProps<{ items: Array<{ id: string; name: string; country: string; purpose: string; status: string; dpa_signed: boolean; transfer_assessment: boolean }> }>()
</script>
<template><section class="privacy-panel"><header><h2>پردازشگرها و محل داده</h2><p>DPA، Subprocessor و Transfer Assessment</p></header><article v-for="item in items" :key="item.id" class="privacy-row"><div><b>{{ item.name }} · {{ item.country }}</b><small>{{ item.purpose }} · DPA: {{ item.dpa_signed ? 'دارد' : 'ناقص' }}</small></div><span class="privacy-status">{{ item.status }}</span></article></section></template>
