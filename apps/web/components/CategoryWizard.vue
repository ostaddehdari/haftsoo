<script setup lang="ts">
type Choice = { key: string; slug: string; title: string; children?: Choice[] };
const props = defineProps<{ modelValue?: { key: string; slug: string; title: string; path: string[] } }>();
const emit = defineEmits<{ "update:modelValue": [value: { key: string; slug: string; title: string; path: string[] }] }>();
const fallback: Choice[] = [
  { key: "real-estate", slug: "real-estate", title: "املاک", children: [{ key: "apartment-sell", slug: "apartment-sell", title: "فروش آپارتمان" }, { key: "apartment-rent", slug: "apartment-rent", title: "اجاره آپارتمان" }] },
  { key: "vehicles", slug: "vehicles", title: "وسایل نقلیه", children: [{ key: "cars", slug: "cars", title: "خودرو سواری" }, { key: "motorcycles", slug: "motorcycles", title: "موتورسیکلت" }] },
  { key: "digital", slug: "digital-goods", title: "کالای دیجیتال", children: [{ key: "mobile", slug: "mobile-phones", title: "موبایل" }, { key: "laptop", slug: "laptop-notebook-macbook", title: "لپ‌تاپ" }] }
];
const categories = ref<Choice[]>(fallback); const selectedRoot = ref<Choice>();
function choose(root: Choice, child?: Choice) { if (!child && root.children?.length) { selectedRoot.value = root; return; } const leaf = child ?? root; emit("update:modelValue", { key: leaf.key, slug: leaf.slug, title: leaf.title, path: child ? [root.title, child.title] : [root.title] }); }
onMounted(async () => { try { const config = useRuntimeConfig(); const response = await $fetch<{ data: Choice[] }>(`${config.public.apiBase}/catalog/categories/tree`, { headers: { "x-tenant-id": "00000000-0000-4000-8000-000000000001" } }); if (response.data.length) categories.value = response.data; } catch { /* offline fixture */ } });
</script>
<template><section><h2>دسته‌بندی آگهی را انتخاب کنید</h2><p class="submission-hint">انتخاب دقیق دسته، فرم و فیلترهای مناسب را فعال می‌کند.</p><div class="category-choice-grid"><button v-for="root in categories" :key="root.key" type="button" :class="{ selected: selectedRoot?.key === root.key || modelValue?.path[0] === root.title }" @click="choose(root)"><strong>{{ root.title }}</strong><span>‹</span></button></div><div v-if="selectedRoot?.children?.length" class="category-children"><button v-for="child in selectedRoot.children" :key="child.key" type="button" :class="{ selected: modelValue?.key === child.key }" @click="choose(selectedRoot!, child)">{{ child.title }}</button></div></section></template>
