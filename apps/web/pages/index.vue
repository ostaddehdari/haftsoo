<script setup lang="ts">
const runtime = useRuntimeConfig();
const categories = ["املاک", "وسایل نقلیه", "کالای دیجیتال", "خانه و آشپزخانه", "خدمات", "استخدام"];
</script>

<template>
  <main id="main" class="shell">
    <header class="hero">
      <span class="brand-mark" aria-hidden="true">ه‍</span>
      <div>
        <p class="eyebrow">هفت‌سو</p>
        <h1>بازار آگهی‌های ایران</h1>
        <p>پوستهٔ اجرایی Nuxt 3 برای جست‌وجو، ثبت آگهی و تجربهٔ مکانی دقیق.</p>
      </div>
    </header>

    <form class="search" role="search" @submit.prevent>
      <label for="query">جست‌وجوی آگهی</label>
      <input id="query" name="query" type="search" placeholder="مثلاً آپارتمان در اصفهان" />
      <button type="submit">جست‌وجو</button>
    </form>

    <section aria-labelledby="categories-title">
      <h2 id="categories-title">دسته‌بندی‌ها</h2>
      <ul class="category-grid">
        <li v-for="category in categories" :key="category"><a href="#">{{ category }}</a></li>
      </ul>
    </section>

    <footer>API: <code>{{ runtime.public.apiBase }}</code> · Stage 03</footer>
  </main>
</template>
