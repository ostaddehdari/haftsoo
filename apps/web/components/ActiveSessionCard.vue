<script setup lang="ts">
import type { AuthSession } from "~/composables/useAuth";
defineProps<{ session: AuthSession; busy?: boolean }>();
defineEmits<{ revoke: [id: string] }>();
</script>

<template>
  <article class="session-card" :class="{ 'session-revoked': session.status !== 'active' }">
    <span class="session-device" aria-hidden="true">{{ session.device_kind === "mobile" ? "▯" : "▰" }}</span>
    <div><h3>{{ session.device_name }} <small v-if="session.current">همین دستگاه</small></h3><p>{{ session.last_ip_label }} · آخرین فعالیت {{ new Date(session.last_seen_at).toLocaleString("fa-IR") }}</p><p>ایجاد: {{ new Date(session.created_at).toLocaleDateString("fa-IR") }}</p></div>
    <button v-if="session.status === 'active'" class="secondary-action" :disabled="busy" type="button" @click="$emit('revoke', session.id)">{{ session.current ? "خروج" : "حذف دسترسی" }}</button>
    <span v-else class="status-chip">بسته‌شده</span>
  </article>
</template>
