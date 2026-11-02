<script setup lang="ts">
const route = useRoute();
const routeKey = computed(() => String(route.params.conversation || ""));
const mobileConversation = ref(Boolean(routeKey.value));
const safetyOpen = ref(false);
const reportSent = ref(false);
const { active, activeId, blockPeer, blocked, connection, conversations, error, loadOlder, loadingOlder, openConversation, pending, report, retry, send, setTyping, timeline, typing, unreadTotal } = useChat(routeKey);
watch(routeKey, async (value: string) => { if (value) { await openConversation(value); mobileConversation.value = true; } });
watch(activeId, (value: string) => { if (import.meta.client && value && routeKey.value !== value) history.replaceState({}, "", `${useRuntimeConfig().app.baseURL}chat/${value}`); });
async function select(id: string) { await openConversation(id); mobileConversation.value = true; }
async function submitReport(reason: string, details: string) { await report(reason, details); reportSent.value = true; safetyOpen.value = false; }
async function toggleBlock(value: boolean) { await blockPeer(value); safetyOpen.value = false; }
useSeoMeta({ title: "گفتگوهای من | هفت‌سو", description: "پیام‌های امن کاربران هفت‌سو درباره آگهی‌ها" });
</script>
<template>
  <main id="main-content" class="chat-page"><div class="chat-shell" :class="{ 'show-conversation': mobileConversation }"><ChatInbox :items="conversations" :active-id="activeId" :pending="pending" @select="select"/><section v-if="active" class="chat-conversation" aria-label="صفحه گفتگو"><ChatConversationHeader :conversation="active" :connection="connection" :typing="typing" @back="mobileConversation=false" @safety="safetyOpen=true"/><div v-if="connection === 'offline' || connection === 'reconnecting'" class="chat-network-banner" role="status">{{ connection === 'offline' ? 'اتصال قطع است؛ پیام‌ها پس از اتصال ارسال می‌شوند.' : 'در حال برقراری دوباره ارتباط…' }}</div><div class="chat-timeline"><button v-if="timeline.length" class="chat-load-older" type="button" :disabled="loadingOlder" @click="loadOlder">{{ loadingOlder ? 'در حال دریافت…' : 'پیام‌های قدیمی‌تر' }}</button><p class="chat-day">امروز</p><ChatMessageBubble v-for="message in timeline" :key="message.clientMessageId" :message="message" @retry="retry(message)"/><p v-if="typing" class="chat-typing" aria-live="polite"><span/><span/><span/> در حال نوشتن</p></div><ChatComposer :blocked="blocked" @send="send" @typing="setTyping"/></section><section v-else class="chat-welcome"><span aria-hidden="true">◌</span><h2>گفتگویی را انتخاب کنید</h2><p>برای شروع، یکی از گفتگوهای فهرست را باز کنید.</p><small v-if="unreadTotal">{{ unreadTotal.toLocaleString('fa-IR') }} پیام خوانده‌نشده دارید.</small></section></div><p v-if="error" class="chat-demo-note" role="status">{{ error }}</p><p v-if="reportSent" class="post-action-message" role="status">گزارش شما برای بررسی ثبت شد.</p><Teleport to="body"><ChatSafetyDialog v-if="safetyOpen" :blocked="blocked" @close="safetyOpen=false" @block="toggleBlock" @report="submitReport"/></Teleport></main>
</template>
