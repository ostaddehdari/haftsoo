<script setup lang="ts">
useHead({ title: "ورود به هفت‌سو", meta: [{ name: "robots", content: "noindex,nofollow" }] });
const route = useRoute();
function authenticated() {
  const next = typeof route.query.next === "string" && route.query.next.startsWith("/") ? route.query.next : "/my/posts";
  navigateTo(next);
}
</script>

<template>
  <main class="auth-page"><AuthLoginPanel @authenticated="authenticated" /><aside class="auth-safety"><h2>امنیت حساب</h2><ul><li>کد ورود را در اختیار دیگران نگذارید.</li><li>هفت‌سو هرگز رمز یا کد شما را درخواست نمی‌کند.</li><li>نشست‌های فعال از تنظیمات قابل مشاهده و حذف هستند.</li></ul></aside></main>
</template>
