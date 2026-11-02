<script setup lang="ts">
defineProps<{ blocked: boolean }>();
const emit = defineEmits<{ close: []; block: [value: boolean]; report: [reason: string, details: string] }>();
const reason = ref("harassment");
const details = ref("");
function submit() { emit('report', reason.value, details.value.trim()); details.value = ""; }
</script>
<template>
  <div class="post-dialog-backdrop" @click.self="emit('close')"><section class="post-dialog chat-safety-dialog" role="dialog" aria-modal="true" aria-labelledby="chat-safety-title"><h2 id="chat-safety-title">امنیت گفتگو</h2><p>درخواست پرداخت بیعانه یا انتقال گفتگو به پیام‌رسان دیگر می‌تواند نشانه کلاهبرداری باشد.</p><button class="button button-secondary" type="button" @click="emit('block', !blocked)">{{ blocked ? 'برداشتن مسدودسازی' : 'مسدودکردن کاربر' }}</button><hr><form @submit.prevent="submit"><label>دلیل گزارش<select v-model="reason"><option value="fraud">احتمال کلاهبرداری</option><option value="harassment">مزاحمت</option><option value="spam">پیام ناخواسته</option><option value="prohibited">محتوای ممنوع</option><option value="other">سایر</option></select></label><label>توضیح<textarea v-model="details" maxlength="1000" rows="3"/></label><div><button class="button button-secondary" type="button" @click="emit('close')">انصراف</button><button class="button button-primary" type="submit">ارسال گزارش</button></div></form></section></div>
</template>
