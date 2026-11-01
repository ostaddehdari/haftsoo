<script setup lang="ts">
import type { CityOption } from "~/composables/useSelectedCities";
import { popularCities } from "~/composables/useSelectedCities";

const props = defineProps<{ modelValue: CityOption[] }>();
const emit = defineEmits<{ "update:modelValue": [value: CityOption[]]; close: [] }>();
const query = ref("");
const draft = ref<CityOption[]>([...props.modelValue]);
const filtered = computed(() => {
  const value = query.value.trim();
  return value ? popularCities.filter((city) => `${city.name} ${city.province}`.includes(value)) : popularCities;
});

function selected(city: CityOption) {
  return draft.value.some((item: CityOption) => item.slug === city.slug);
}

function toggle(city: CityOption) {
  if (selected(city)) draft.value = draft.value.filter((item: CityOption) => item.slug !== city.slug);
  else if (draft.value.length < 10) draft.value = [...draft.value, city];
}

function confirm() {
  emit("update:modelValue", draft.value.length ? draft.value : [popularCities[2]]);
  emit("close");
}
</script>

<template>
  <section class="city-dialog" role="dialog" aria-modal="true" aria-labelledby="city-dialog-title">
    <header class="dialog-header">
      <div>
        <p class="eyebrow">موقعیت آگهی‌ها</p>
        <h2 id="city-dialog-title">انتخاب شهر</h2>
      </div>
      <button class="icon-button" type="button" aria-label="بستن" @click="emit('close')">×</button>
    </header>
    <label class="search-field">
      <span class="visually-hidden">جست‌وجوی شهر</span>
      <span aria-hidden="true">⌕</span>
      <input v-model="query" type="search" placeholder="نام شهر یا استان" autofocus>
    </label>
    <p class="selection-help">تا ۱۰ شهر را هم‌زمان انتخاب کنید. {{ draft.length }} شهر انتخاب شده است.</p>
    <div v-if="filtered.length" class="city-options">
      <label v-for="city in filtered" :key="city.slug" :class="['city-option', { selected: selected(city) }]">
        <input type="checkbox" :checked="selected(city)" :disabled="!selected(city) && draft.length >= 10" @change="toggle(city)">
        <span><strong>{{ city.name }}</strong><small>{{ city.province }}</small></span>
      </label>
    </div>
    <UiState v-else kind="empty" title="شهری پیدا نشد" description="نام شهر را با املای دیگری جست‌وجو کنید." compact />
    <footer class="dialog-actions">
      <button class="button button-secondary" type="button" @click="emit('close')">انصراف</button>
      <button class="button button-primary" type="button" @click="confirm">تأیید شهرها</button>
    </footer>
  </section>
</template>
