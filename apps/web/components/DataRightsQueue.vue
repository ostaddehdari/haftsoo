<script setup lang="ts">
defineProps<{ items: Array<{ id: string; request_type: string; status: string; verified: boolean; due_at: string; submitted_at: string }> }>()
</script>
<template><section class="privacy-panel"><header><h2>درخواست‌های حقوق داده</h2><p>دسترسی، خروجی، اصلاح، حذف، محدودسازی و اعتراض</p></header><article v-for="item in items" :key="item.id" class="privacy-row"><div><b>{{ item.request_type }} · {{ item.verified ? 'هویت تأییدشده' : 'در انتظار احراز' }}</b><small>مهلت: {{ new Date(item.due_at).toLocaleDateString('fa-IR') }}</small></div><span class="privacy-status">{{ item.status }}</span></article></section></template>
