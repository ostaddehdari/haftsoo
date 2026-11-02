<script setup lang="ts">
useHead({ title: "دستگاه‌های فعال | هفت‌سو", meta: [{ name: "robots", content: "noindex,nofollow" }] });
const auth = useAuth();
const busyId = ref("");
onMounted(async () => {
  if (!auth.accessToken.value && !await auth.restore()) { await navigateTo("/auth/login?next=/my/settings/sessions"); return; }
  await auth.loadSessions().catch(async () => { await navigateTo("/auth/login?next=/my/settings/sessions"); });
});
async function revoke(id: string) {
  busyId.value = id;
  try {
    const current = auth.sessions.value.find(session => session.id === id)?.current;
    await auth.revokeSession(id);
    if (current) { await auth.logout(); await navigateTo("/auth/login"); }
  } finally { busyId.value = ""; }
}
</script>

<template>
  <main class="sessions-page"><header><NuxtLink to="/my/posts">بازگشت</NuxtLink><h1>دستگاه‌های فعال</h1><p>دسترسی حساب خود را روی مرورگرها و دستگاه‌های دیگر مدیریت کنید.</p></header><UiState v-if="auth.pending.value && !auth.sessions.value.length" kind="loading" title="در حال دریافت نشست‌ها" description="فهرست دستگاه‌های متصل در حال بارگذاری است." /><p v-if="auth.error.value" class="auth-error" role="alert">{{ auth.error.value }}</p><div class="session-list"><ActiveSessionCard v-for="session in auth.sessions.value" :key="session.id" :session="session" :busy="busyId === session.id" @revoke="revoke" /></div></main>
</template>
