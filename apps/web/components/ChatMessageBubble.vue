<script setup lang="ts">
import type { ChatMessageView } from "~/composables/useChat";
defineProps<{ message: ChatMessageView }>();
const emit = defineEmits<{ retry: [] }>();
const time = (value: string) => new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
</script>
<template>
  <article class="chat-message" :class="message.fromMe ? 'chat-message--mine' : 'chat-message--peer'" :data-delivery="message.delivery">
    <p>{{ message.body }}</p><footer><time :datetime="message.createdAt">{{ time(message.createdAt) }}</time><span v-if="message.fromMe" aria-label="وضعیت ارسال">{{ message.delivery === 'pending' ? '◷' : message.delivery === 'seen' ? '✓✓' : message.delivery === 'failed' ? '!' : '✓' }}</span></footer>
    <button v-if="message.delivery === 'failed'" type="button" @click="emit('retry')">ارسال دوباره</button>
  </article>
</template>
