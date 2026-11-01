<script setup lang="ts">
import { categoryLabel, listingCategories, listingPosts } from "~/composables/useListingData";
import type { ListingPost } from "~/composables/useListingData";

const route = useRoute();
const city = computed(() => String(route.params.city || "isfahan"));
const selectedCategory = computed(() => route.params.category ? String(route.params.category) : undefined);
const selectedDistricts = computed(() => typeof route.query.districts === "string" ? route.query.districts.split(",").filter(Boolean) : []);
const cityOption = computed(() => popularCities.find((item) => item.slug === city.value) ?? popularCities[2]!);
const query = computed(() => typeof route.query.q === "string" ? route.query.q.trim() : "");
const sort = ref<"newest" | "price-asc" | "price-desc">("newest");
const viewCookie = useCookie<"grid" | "list">("hs-list-view", { default: () => "grid", sameSite: "lax" });
const view = computed<"grid" | "list">({ get: () => viewCookie.value || "grid", set: (value: "grid" | "list") => { viewCookie.value = value; } });
const photoOnly = ref(false);
const loading = ref(false);
const pageSize = 6;
const requestedPage = computed(() => Math.max(1, Number(route.query.page) || 1));
const visibleCount = ref(requestedPage.value * pageSize);
const loadSentinel = ref<HTMLElement | null>(null);
const { mapMode, selectedPostId, clusters: mapClusters, loading: mapLoading, error: mapError, setMapMode, selectPost, updateViewport } = useMapSearch(selectedCategory, selectedDistricts);
const selectedMapPost = computed(() => visiblePosts.value.find((post: ListingPost) => post.listingId === selectedPostId.value));
let observer: IntersectionObserver | undefined;
let loadingTimer: ReturnType<typeof setTimeout> | undefined;

const rootCategory = computed(() => {
  const selected = selectedCategory.value;
  if (!selected) return undefined;
  const root = listingCategories.find((item) => item.slug === selected || item.children?.some((child) => child.slug === selected));
  return root?.slug;
});

const filteredPosts = computed(() => {
  const normalizedQuery = query.value.toLocaleLowerCase("fa-IR");
  const result = listingPosts.filter((post) => {
    const cityMatch = post.city === city.value || city.value === "all";
    const categoryMatch = !rootCategory.value || post.category === rootCategory.value;
    const queryMatch = !normalizedQuery || `${post.title} ${post.district} ${post.priceLabel}`.toLocaleLowerCase("fa-IR").includes(normalizedQuery);
    return cityMatch && categoryMatch && queryMatch && (!photoOnly.value || Boolean(post.thumbnail));
  });
  return [...result].sort((a, b) => sort.value === "price-asc" ? (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER) : sort.value === "price-desc" ? (b.price ?? -1) - (a.price ?? -1) : a.publishedAt - b.publishedAt);
});

const visiblePosts = computed(() => filteredPosts.value.slice(0, visibleCount.value));
const pageCount = computed(() => Math.max(1, Math.ceil(filteredPosts.value.length / pageSize)));
const hasMore = computed(() => visibleCount.value < filteredPosts.value.length);
const title = computed(() => query.value ? `نتایج «${query.value}» در ${cityOption.value.name}` : `${categoryLabel(selectedCategory.value)} در ${cityOption.value.name}`);

function pulseLoading() {
  loading.value = true;
  if (loadingTimer) clearTimeout(loadingTimer);
  loadingTimer = setTimeout(() => { loading.value = false; }, 180);
}

function selectCategory(slug?: string) {
  visibleCount.value = pageSize;
  navigateTo({ path: slug ? `/s/${city.value}/${slug}` : `/s/${city.value}`, query: query.value ? { q: query.value } : undefined });
}

function setView(next: "grid" | "list") { view.value = next; }
function loadMore() { if (hasMore.value && !loading.value) visibleCount.value += pageSize; }
function pageHref(page: number) { return { path: route.path, query: { ...route.query, page: page === 1 ? undefined : String(page) } }; }

watch([sort, photoOnly], () => { visibleCount.value = pageSize; pulseLoading(); });
watch(requestedPage, (page: number) => { visibleCount.value = page * pageSize; });

onMounted(() => {
  observer = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) loadMore(); }, { rootMargin: "240px" });
  if (loadSentinel.value) observer.observe(loadSentinel.value);
});
onBeforeUnmount(() => { observer?.disconnect(); if (loadingTimer) clearTimeout(loadingTimer); });

useSeoMeta({
  title: () => `${title.value} | هفت‌سو`,
  description: () => `مشاهده ${filteredPosts.value.length} آگهی ${categoryLabel(selectedCategory.value)} در ${cityOption.value.name} با مرتب‌سازی و نمایش سریع.`,
  ogTitle: () => `${title.value} | هفت‌سو`,
  ogDescription: () => `آگهی‌های تازه ${cityOption.value.name} در بازار محلی هفت‌سو.`,
  ogType: "website",
  ogLocale: "fa_IR"
});
useHead(() => ({ link: [{ rel: "canonical", href: `https://srun.ir/haftsoo/s/${city.value}${selectedCategory.value ? `/${selectedCategory.value}` : ""}` }] }));
</script>

<template>
  <main id="main-content" class="listing-page">
    <div class="listing-shell">
      <nav class="breadcrumb" aria-label="مسیر صفحه"><NuxtLink to="/">هفت‌سو</NuxtLink><span aria-hidden="true">‹</span><NuxtLink :to="`/s/${city}`">{{ cityOption.name }}</NuxtLink><template v-if="selectedCategory"><span aria-hidden="true">‹</span><span aria-current="page">{{ categoryLabel(selectedCategory) }}</span></template></nav>

      <div class="listing-mobile-categories">
        <details><summary>دسته‌بندی‌ها <span>{{ categoryLabel(selectedCategory) }}</span></summary><CategorySidebar :categories="listingCategories" :selected="selectedCategory" :city="city" @select="selectCategory" /></details>
        <label class="listing-toggle listing-toggle--mobile"><span><strong>فقط عکس‌دار</strong><small>حذف آگهی‌های بدون تصویر</small></span><input v-model="photoOnly" type="checkbox"></label>
      </div>

      <div class="listing-grid-shell">
        <aside class="listing-aside"><CategorySidebar :categories="listingCategories" :selected="selectedCategory" :city="city" @select="selectCategory" /><label class="listing-toggle"><span><strong>فقط عکس‌دار</strong><small>حذف آگهی‌های بدون تصویر</small></span><input v-model="photoOnly" type="checkbox"></label></aside>

        <section class="listing-results" aria-labelledby="listing-heading">
          <header class="listing-heading"><div><p class="eyebrow">بازار محلی {{ cityOption.name }}</p><h1 id="listing-heading">{{ title }}</h1><p><strong>{{ formatCount(filteredPosts.length) }}</strong> آگهی پیدا شد</p></div><button class="button button-secondary map-link" type="button" :aria-pressed="mapMode" @click="setMapMode(!mapMode)">{{ mapMode ? "نمایش فهرست" : "نمایش روی نقشه" }}</button></header>

          <div class="listing-controls">
            <label><span>مرتب‌سازی</span><select v-model="sort" aria-label="مرتب‌سازی آگهی‌ها"><option value="newest">جدیدترین</option><option value="price-asc">ارزان‌ترین</option><option value="price-desc">گران‌ترین</option></select></label>
            <div class="view-switch" role="group" aria-label="حالت نمایش"><button type="button" :class="{ active: view === 'grid' }" :aria-pressed="view === 'grid'" @click="setView('grid')">▦<span class="visually-hidden">شبکه‌ای</span></button><button type="button" :class="{ active: view === 'list' }" :aria-pressed="view === 'list'" @click="setView('list')">☷<span class="visually-hidden">فهرستی</span></button></div>
          </div>

          <section v-if="mapMode" class="map-workspace" aria-label="نمایش نقشه آگهی‌ها">
            <ClientOnly><ClassifiedsMap :posts="visiblePosts" :city="city" :selected-post-id="selectedPostId" :neighborhood-keys="selectedDistricts" :server-clusters="mapClusters" @select="selectPost" @viewport="updateViewport" /><template #fallback><ListingSkeleton /></template></ClientOnly>
            <div v-if="mapLoading" class="map-status" role="status">در حال جست‌وجوی این محدوده…</div>
            <div v-if="mapError" class="map-status map-status--warning">{{ mapError }}</div>
            <MapPostPreview v-if="selectedMapPost" :post="selectedMapPost" @close="selectPost(undefined)" />
          </section>
          <ListingSkeleton v-else-if="loading" />
          <div v-else-if="visiblePosts.length" class="listing-posts" :class="`listing-posts--${view}`" aria-live="polite"><PostCard v-for="post in visiblePosts" :key="post.listingId" :post="post" :view="view" /></div>
          <UiState v-else kind="empty" title="آگهی‌ای با این شرایط پیدا نشد" description="عبارت جست‌وجو یا دسته‌بندی را تغییر دهید و دوباره امتحان کنید."><button class="button button-secondary" type="button" @click="selectCategory()">حذف دسته‌بندی</button></UiState>

          <div v-if="visiblePosts.length && !mapMode" ref="loadSentinel" class="load-more" :aria-busy="loading"><button v-if="hasMore" class="button button-secondary" type="button" @click="loadMore">نمایش آگهی‌های بیشتر</button><span v-else>همه آگهی‌های موجود نمایش داده شد.</span></div>
          <nav v-if="filteredPosts.length > pageSize && !mapMode" class="pagination" aria-label="صفحه‌بندی آگهی‌ها"><NuxtLink v-for="page in pageCount" :key="page" :to="pageHref(page)" :aria-current="requestedPage === page ? 'page' : undefined">{{ formatCount(page) }}</NuxtLink></nav>
        </section>
      </div>
    </div>
  </main>
</template>
