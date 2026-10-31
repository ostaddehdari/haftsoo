<script setup lang="ts">
type Place = { key: string; name: string; type: "province" | "city" | "neighborhood"; metadata?: Record<string, unknown> };
type Selection = { provinceKey?: string; cityKey?: string; neighborhoodKeys: string[] };

const props = withDefaults(defineProps<{ tenantId: string; modelValue?: Selection }>(), {
  modelValue: () => ({ neighborhoodKeys: [] })
});
const emit = defineEmits<{ "update:modelValue": [value: Selection] }>();
const config = useRuntimeConfig();
const provinces = ref<Place[]>([]);
const cities = ref<Place[]>([]);
const neighborhoods = ref<Place[]>([]);
const provinceKey = ref(props.modelValue.provinceKey ?? "");
const cityKey = ref(props.modelValue.cityKey ?? "");
const neighborhoodKeys = ref<string[]>(props.modelValue.neighborhoodKeys ?? []);
const loading = ref(false);
const error = ref("");

async function load(parentKey?: string, type?: Place["type"]): Promise<Place[]> {
  const query = new URLSearchParams();
  if (parentKey) query.set("parentKey", parentKey);
  if (type) query.set("type", type);
  const response = await $fetch<{ data: Place[] }>(`${config.public.apiBase}/geo/places?${query}`, {
    headers: { "x-tenant-id": props.tenantId }
  });
  return response.data;
}

async function selectProvince() {
  cityKey.value = "";
  neighborhoodKeys.value = [];
  neighborhoods.value = [];
  cities.value = provinceKey.value ? await load(provinceKey.value, "city") : [];
  update();
}

async function selectCity() {
  neighborhoodKeys.value = [];
  neighborhoods.value = cityKey.value ? await load(cityKey.value, "neighborhood") : [];
  update();
}

function update() {
  emit("update:modelValue", {
    provinceKey: provinceKey.value || undefined,
    cityKey: cityKey.value || undefined,
    neighborhoodKeys: neighborhoodKeys.value
  });
}

onMounted(async () => {
  loading.value = true;
  try {
    provinces.value = await load("iran", "province");
    if (provinceKey.value) cities.value = await load(provinceKey.value, "city");
    if (cityKey.value) neighborhoods.value = await load(cityKey.value, "neighborhood");
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "دریافت فهرست مکان‌ها ناموفق بود";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <fieldset class="geo-selector" :aria-busy="loading">
    <legend>انتخاب شهر و محله</legend>
    <label>استان
      <select v-model="provinceKey" :disabled="loading" @change="selectProvince">
        <option value="">انتخاب استان</option>
        <option v-for="place in provinces" :key="place.key" :value="place.key">{{ place.name }}</option>
      </select>
    </label>
    <label>شهر
      <select v-model="cityKey" :disabled="!provinceKey || loading" @change="selectCity">
        <option value="">انتخاب شهر</option>
        <option v-for="place in cities" :key="place.key" :value="place.key">{{ place.name }}</option>
      </select>
    </label>
    <label>محله‌ها
      <select v-model="neighborhoodKeys" multiple :disabled="!cityKey || loading" @change="update">
        <option v-for="place in neighborhoods" :key="place.key" :value="place.key">{{ place.name }}</option>
      </select>
    </label>
    <p v-if="error" class="geo-selector__error" role="alert">{{ error }}</p>
    <small v-else>برای انتخاب چند محله از Ctrl یا ⌘ استفاده کنید.</small>
  </fieldset>
</template>
