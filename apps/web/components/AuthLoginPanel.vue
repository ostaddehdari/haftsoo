<script setup lang="ts">
import type { AuthDeliveryMethod } from "~/composables/useAuth";
const emit = defineEmits<{ authenticated: [] }>();
const auth = useAuth();
const step = ref<"phone" | "otp" | "done">("phone");
const phone = ref("");
const method = ref<AuthDeliveryMethod>("sms");
const code = ref("");
const preAuthSessionId = ref("");
const maskedPhone = ref("");
const cooldown = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;

onBeforeUnmount(() => timer && clearInterval(timer));
function startCooldown(seconds = 30) {
  cooldown.value = seconds;
  if (timer) clearInterval(timer);
  timer = setInterval(() => { if (cooldown.value > 0) cooldown.value -= 1; else if (timer) clearInterval(timer); }, 1000);
}
async function send() {
  const result = await auth.sendCode(phone.value, method.value);
  preAuthSessionId.value = result.preAuthSessionId;
  maskedPhone.value = result.maskedPhone;
  step.value = "otp";
  startCooldown();
}
async function verify() {
  if (code.value.length !== 6) return;
  await auth.consumeCode(preAuthSessionId.value, code.value);
  step.value = "done";
  emit("authenticated");
}
</script>

<template>
  <section class="auth-panel" aria-live="polite">
    <header><span class="auth-mark" aria-hidden="true">۷</span><div><h1>ورود به هفت‌سو</h1><p>ورود امن با شمارهٔ موبایل</p></div></header>
    <form v-if="step === 'phone'" @submit.prevent="send">
      <label class="auth-field"><span>شمارهٔ موبایل</span><input v-model="phone" dir="ltr" inputmode="tel" autocomplete="tel" placeholder="09121234567" required></label>
      <fieldset><legend>روش دریافت کد</legend><label><input v-model="method" type="radio" value="sms"> پیامک</label><label><input v-model="method" type="radio" value="call"> تماس</label><label><input v-model="method" type="radio" value="messenger"> پیام‌رسان</label></fieldset>
      <p v-if="auth.error.value" class="auth-error" role="alert">{{ auth.error.value }}</p>
      <button class="button button-primary auth-submit" :disabled="auth.pending.value" type="submit">{{ auth.pending.value ? "در حال ارسال…" : "دریافت کد" }}</button>
    </form>
    <form v-else-if="step === 'otp'" @submit.prevent="verify">
      <p>کد تأیید به <b dir="ltr">{{ maskedPhone }}</b> ارسال شد.</p>
      <OtpCodeInput v-model="code" :disabled="auth.pending.value" @complete="verify" />
      <p v-if="auth.error.value" class="auth-error" role="alert">{{ auth.error.value }}</p>
      <button class="button button-primary auth-submit" :disabled="code.length !== 6 || auth.pending.value" type="submit">ورود</button>
      <button class="auth-link" :disabled="cooldown > 0" type="button" @click="send">{{ cooldown ? `ارسال دوباره تا ${cooldown} ثانیه` : "ارسال دوباره" }}</button>
      <button class="auth-link" type="button" @click="step = 'phone'">ویرایش شماره</button>
    </form>
    <div v-else class="auth-success"><span aria-hidden="true">✓</span><h2>با موفقیت وارد شدید</h2><NuxtLink class="button button-primary" to="/my/posts">رفتن به هفت‌سوی من</NuxtLink></div>
  </section>
</template>
