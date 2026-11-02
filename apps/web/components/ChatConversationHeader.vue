<script setup lang="ts">
import type { ChatConnectionState, ChatConversationView } from "~/composables/useChat";
defineProps<{ conversation: ChatConversationView; connection: ChatConnectionState; typing: boolean }>();
const emit = defineEmits<{ back: []; safety: [] }>();
const labels: Record<ChatConnectionState, string> = { idle: "آماده", connecting: "در حال اتصال…", online: "متصل", reconnecting: "اتصال دوباره…", offline: "آفلاین" };
</script>
<template>
  <header class="chat-conversation-header">
    <button class="chat-back" type="button" aria-label="بازگشت به گفتگوها" @click="emit('back')">›</button>
    <span class="chat-avatar" :data-online="conversation.peer.online">{{ conversation.peer.avatar }}</span>
    <div><strong>{{ conversation.peer.name }}</strong><small>{{ typing ? 'در حال نوشتن…' : conversation.peer.lastSeenLabel }}</small></div>
    <span class="chat-connection" :data-state="connection">{{ labels[connection] }}</span>
    <button class="chat-more" type="button" aria-label="امنیت و تنظیمات گفتگو" @click="emit('safety')">⋮</button>
  </header>
  <NuxtLink class="chat-post-strip" :to="`/v/chat/${conversation.postToken}`"><span class="chat-post-thumb">۷</span><span><strong>{{ conversation.title }}</strong><small>مشاهده آگهی</small></span><span aria-hidden="true">‹</span></NuxtLink>
</template>
