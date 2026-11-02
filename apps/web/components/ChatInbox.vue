<script setup lang="ts">
import type { ChatConversationView } from "~/composables/useChat";
const props = defineProps<{ items: ChatConversationView[]; activeId?: string; pending?: boolean }>();
const emit = defineEmits<{ select: [id: string] }>();
const query = ref("");
const filter = ref<"all" | "unread" | "my_post" | "others_post">("all");
const filterOptions: Array<{ id: typeof filter.value; label: string }> = [
  { id: "all", label: "همه" },
  { id: "unread", label: "خوانده‌نشده" },
  { id: "my_post", label: "آگهی‌های من" },
  { id: "others_post", label: "دیگران" }
];
const filtered = computed(() => props.items.filter(item => {
  const matchFilter = filter.value === "all" || (filter.value === "unread" ? item.unreadCount > 0 : item.context === filter.value);
  const needle = query.value.trim();
  return matchFilter && (!needle || `${item.title} ${item.peer.name} ${item.lastMessage}`.includes(needle));
}));
const time = (value: string) => new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
function setFilter(value: "all" | "unread" | "my_post" | "others_post") { filter.value = value; }
</script>
<template>
  <aside class="chat-inbox" aria-label="فهرست گفتگوها">
    <header><div><h1>گفتگوها</h1><small>{{ items.length.toLocaleString('fa-IR') }} مکالمه</small></div></header>
    <label class="chat-search"><span aria-hidden="true">⌕</span><span class="visually-hidden">جست‌وجوی گفتگو</span><input v-model="query" type="search" placeholder="جست‌وجوی نام یا آگهی"></label>
    <div class="chat-filters" role="group" aria-label="فیلتر گفتگوها">
      <button v-for="item in filterOptions" :key="item.id" type="button" :class="{ active: filter === item.id }" :aria-pressed="filter === item.id" @click="setFilter(item.id)">{{ item.label }}</button>
    </div>
    <div v-if="pending" class="chat-list-skeleton" aria-label="در حال دریافت گفتگوها"><span v-for="index in 4" :key="index"/></div>
    <div v-else-if="!filtered.length" class="chat-empty"><span aria-hidden="true">◌</span><strong>گفتگویی پیدا نشد</strong><small>فیلتر یا عبارت جست‌وجو را تغییر دهید.</small></div>
    <nav v-else class="chat-list">
      <button v-for="item in filtered" :key="item.id" type="button" :class="{ active: item.id === activeId }" @click="emit('select', item.id)">
        <span class="chat-avatar" :data-online="item.peer.online">{{ item.peer.avatar }}</span>
        <span class="chat-list-copy"><span><strong>{{ item.peer.name }}</strong><time :datetime="item.lastMessageAt">{{ time(item.lastMessageAt) }}</time></span><b>{{ item.title }}</b><small>{{ item.lastMessage }}</small></span>
        <em v-if="item.unreadCount">{{ item.unreadCount.toLocaleString('fa-IR') }}</em>
      </button>
    </nav>
  </aside>
</template>
