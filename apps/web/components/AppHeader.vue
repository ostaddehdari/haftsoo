<script setup lang="ts">
const dialogOpen = ref(false);
const mobileOpen = ref(false);
const query = ref("");
const { cities, setCities } = useSelectedCities();
const { theme, toggle } = useTheme();
const { track } = useAnalytics();
const cityLabel = computed(() => cities.value.length === 1 ? cities.value[0]?.name : `${cities.value.length} شهر`);

function search() {
  track("home_search", { query_length: query.value.trim().length, city_count: cities.value.length });
  navigateTo({ path: `/s/${cities.value[0]?.slug ?? "isfahan"}`, query: { q: query.value.trim() || undefined, cities: cities.value.map((city) => city.slug).join(",") } });
}

function updateCities(next: typeof cities.value) {
  setCities(next);
  track("city_selection", { city_count: next.length });
}
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <NuxtLink class="brand" to="/" aria-label="هفت‌سو، صفحه نخست"><span class="brand-symbol">۷</span><span>هفت‌سو</span></NuxtLink>
      <button class="location-button" type="button" aria-haspopup="dialog" @click="dialogOpen = true"><span aria-hidden="true">⌖</span>{{ cityLabel }}</button>
      <form class="header-search" role="search" @submit.prevent="search">
        <label class="visually-hidden" for="global-search">جست‌وجوی آگهی</label>
        <span aria-hidden="true">⌕</span><input id="global-search" v-model="query" type="search" placeholder="جست‌وجو در همه آگهی‌ها">
      </form>
      <nav class="desktop-navigation" aria-label="ناوبری اصلی">
        <NuxtLink :to="`/s/${cities[0]?.slug ?? 'isfahan'}`">دسته‌ها</NuxtLink><NuxtLink to="/">چت</NuxtLink><NuxtLink to="/my/posts">هفت‌سوی من</NuxtLink>
      </nav>
      <button class="icon-button theme-toggle" type="button" :aria-label="theme === 'dark' ? 'فعال‌کردن پوسته روشن' : 'فعال‌کردن پوسته تیره'" @click="toggle">{{ theme === "dark" ? "☀" : "◐" }}</button>
      <NuxtLink class="button button-primary submit-ad" to="/new">ثبت آگهی</NuxtLink>
      <button class="icon-button menu-toggle" type="button" :aria-expanded="mobileOpen" aria-label="بازکردن منو" @click="mobileOpen = !mobileOpen">☰</button>
    </div>
    <nav v-if="mobileOpen" class="mobile-navigation" aria-label="منوی موبایل"><NuxtLink to="/">خانه</NuxtLink><button type="button" @click="dialogOpen = true">{{ cityLabel }}</button><NuxtLink to="/new">ثبت آگهی</NuxtLink><NuxtLink to="/my/posts">هفت‌سوی من</NuxtLink></nav>
    <div v-if="dialogOpen" class="dialog-backdrop" @click.self="dialogOpen = false">
      <CitySelector :model-value="cities" @update:model-value="updateCities" @close="dialogOpen = false" />
    </div>
  </header>
</template>
