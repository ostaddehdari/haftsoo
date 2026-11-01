<script setup lang="ts">
import { popularCities } from "~/composables/useSelectedCities";

const route = useRoute();
const query = ref(typeof route.query.q === "string" ? route.query.q : "");
const cityQuery = ref("");
const { cities, setCities } = useSelectedCities();
const { track } = useAnalytics();
const categories = [
  ["املاک", "⌂", "real-estate"], ["وسایل نقلیه", "◇", "vehicles"], ["کالای دیجیتال", "▣", "electronic-devices"],
  ["خانه و آشپزخانه", "⌑", "home-kitchen"], ["خدمات", "◎", "services"], ["استخدام", "♙", "jobs"],
  ["وسایل شخصی", "♢", "personal-goods"], ["سرگرمی و فراغت", "△", "leisure-hobbies"], ["اجتماعی", "◌", "community"],
  ["تجهیزات و صنعتی", "⚙", "tools-materials-equipment"]
];
const filteredCities = computed(() => {
  const value = cityQuery.value.trim();
  return value ? popularCities.filter((city) => `${city.name} ${city.province}`.includes(value)) : popularCities;
});

useSeoMeta({
  title: "هفت‌سو؛ بازار آگهی‌های محلی ایران",
  description: "خرید و فروش بی‌واسطه کالا، خودرو، ملک و خدمات در شهرهای ایران با جست‌وجوی مکانی دقیق.",
  ogTitle: "هفت‌سو؛ بازار آگهی‌های محلی ایران",
  ogDescription: "آگهی‌های نزدیک خود را پیدا کنید یا در چند دقیقه آگهی ثبت کنید.",
  ogType: "website",
  ogLocale: "fa_IR",
  ogUrl: "https://srun.ir/haftsoo/",
  twitterCard: "summary_large_image"
});
useHead({ script: [{ type: "application/ld+json", innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "هفت‌سو", url: "https://srun.ir/haftsoo/", inLanguage: "fa-IR", potentialAction: { "@type": "SearchAction", target: "https://srun.ir/haftsoo/?q={search_term_string}", "query-input": "required name=search_term_string" } }) }] });

function submitSearch() {
  track("home_search", { query_length: query.value.trim().length, city_count: cities.value.length });
  navigateTo({ path: "/", query: { q: query.value.trim() || undefined, city: cities.value.map((city) => city.slug).join(",") } });
}

function chooseCity(city: (typeof popularCities)[number]) {
  setCities([city]);
  track("popular_city_click", { city: city.slug });
}
</script>

<template>
  <main id="main-content">
    <section class="home-hero">
      <div class="hero-copy">
        <p class="eyebrow">بازار آگهی‌های محلی ایران</p>
        <h1>هر چیزی که می‌خواهی،<br><span>همین نزدیکی‌هاست.</span></h1>
        <p class="hero-description">میان آگهی‌های شهرهای انتخابی بگرد یا کالایت را در چند دقیقه برای خریداران نزدیک منتشر کن.</p>
        <form class="hero-search" role="search" @submit.prevent="submitSearch">
          <label class="visually-hidden" for="home-search">چه چیزی می‌خواهید؟</label>
          <span aria-hidden="true">⌕</span><input id="home-search" v-model="query" type="search" placeholder="مثلاً آپارتمان، خودرو یا لپ‌تاپ"><button class="button button-primary" type="submit">جست‌وجو</button>
        </form>
        <div class="selected-city-summary"><span aria-hidden="true">⌖</span> جست‌وجو در <strong>{{ cities.map((city) => city.name).join("، ") }}</strong></div>
      </div>
      <div class="hero-visual" aria-hidden="true"><div class="visual-orbit orbit-one"></div><div class="visual-orbit orbit-two"></div><span class="visual-seven">۷</span><span class="visual-card card-home">⌂ املاک</span><span class="visual-card card-car">◇ خودرو</span><span class="visual-card card-phone">▣ دیجیتال</span></div>
    </section>

    <div class="content-container">
      <section class="home-section" aria-labelledby="category-title">
        <div class="section-heading"><div><p class="eyebrow">دسته‌بندی‌ها</p><h2 id="category-title">دنبال چه می‌گردید؟</h2></div><a href="#">همه دسته‌ها</a></div>
        <div class="category-grid"><a v-for="category in categories" :key="category[2]" :href="`?category=${category[2]}`" class="category-card"><span aria-hidden="true">{{ category[1] }}</span><strong>{{ category[0] }}</strong><small>مشاهده آگهی‌ها</small></a></div>
      </section>

      <section class="home-section city-section" aria-labelledby="city-title">
        <div class="section-heading"><div><p class="eyebrow">شهرهای پربازدید</p><h2 id="city-title">آگهی‌های کدام شهر را می‌خواهید؟</h2></div></div>
        <label class="city-search"><span aria-hidden="true">⌕</span><span class="visually-hidden">جست‌وجوی شهر</span><input v-model="cityQuery" type="search" placeholder="نام شهر یا استان"></label>
        <div v-if="filteredCities.length" class="popular-cities"><button v-for="city in filteredCities" :key="city.slug" type="button" @click="chooseCity(city)"><strong>{{ city.name }}</strong><small>{{ city.province }}</small><span aria-hidden="true">‹</span></button></div>
        <UiState v-else kind="empty" title="شهری با این نام پیدا نشد" description="نام شهر یا استان را بررسی و دوباره جست‌وجو کنید." compact />
      </section>

      <section class="safety-banner" aria-labelledby="safety-title"><span class="safety-icon" aria-hidden="true">✓</span><div><h2 id="safety-title">خرید و فروش امن در هفت‌سو</h2><p>پیش از پرداخت، کالا را ببینید و گفتگو را داخل هفت‌سو ادامه دهید.</p></div><a href="#">راهنمای امنیت</a></section>
    </div>
  </main>
</template>
