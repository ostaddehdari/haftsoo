<script setup lang="ts">
defineProps<{ modelValue: string; disabled?: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: string]; complete: [value: string] }>();
function update(event: Event) {
  const target = event.target as HTMLInputElement;
  const value = target.value.replace(/[۰-۹]/g, character => String("۰۱۲۳۴۵۶۷۸۹".indexOf(character))).replace(/\D/g, "").slice(0, 6);
  emit("update:modelValue", value);
  if (value.length === 6) emit("complete", value);
}
</script>

<template>
  <label class="otp-field">
    <span>کد شش‌رقمی</span>
    <input :value="modelValue" :disabled="disabled" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9۰-۹]{6}" autofocus aria-describedby="otp-help" @input="update">
    <small id="otp-help">کد ارسال‌شده را وارد کنید.</small>
  </label>
</template>
