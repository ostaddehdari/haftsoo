<script setup lang="ts">
defineProps<{ postId: string }>(); defineEmits<{ close: [] }>();
</script>
<template>
  <section class="history-panel" role="dialog" aria-modal="true" aria-labelledby="history-title">
    <header><div><p class="eyebrow">ردیابی تغییرات</p><h2 id="history-title">تاریخچه نسخه‌های آگهی</h2></div><button class="icon-button" type="button" aria-label="بستن" @click="$emit('close')">×</button></header>
    <ol class="version-timeline"><li><strong>نسخه فعلی</strong><span>ویرایش اطلاعات و ارسال برای بررسی</span></li><li><strong>نسخه پیشین</strong><span>ایجاد آگهی با شناسه {{ postId }}</span></li></ol>
  </section>
</template>
