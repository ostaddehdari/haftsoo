<script setup lang="ts">
withDefaults(defineProps<{
  kind: "loading" | "error" | "empty";
  title: string;
  description: string;
  compact?: boolean;
}>(), { compact: false });
defineEmits<{ retry: [] }>();
</script>

<template>
  <div :class="['ui-state', `ui-state--${kind}`, { 'ui-state--compact': compact }]" :role="kind === 'error' ? 'alert' : 'status'" :aria-live="kind === 'loading' ? 'polite' : 'off'">
    <span v-if="kind === 'loading'" class="state-spinner" aria-hidden="true"></span>
    <span v-else class="state-icon" aria-hidden="true">{{ kind === 'error' ? '!' : '⌕' }}</span>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <button v-if="kind === 'error'" class="button button-secondary" type="button" @click="$emit('retry')">تلاش دوباره</button>
  </div>
</template>
