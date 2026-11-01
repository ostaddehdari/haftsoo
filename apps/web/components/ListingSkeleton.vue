<template>
  <div class="listing-skeleton" aria-label="در حال دریافت آگهی‌ها" aria-busy="true">
    <article v-for="index in 6" :key="index" class="skeleton-card"><span class="skeleton-block skeleton-media"></span><div><span class="skeleton-block skeleton-title"></span><span class="skeleton-block skeleton-line"></span><span class="skeleton-block skeleton-line short"></span></div></article>
  </div>
</template>
