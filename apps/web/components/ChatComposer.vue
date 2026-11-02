<script setup lang="ts">
const props = defineProps<{ disabled?: boolean; blocked?: boolean }>();
const emit = defineEmits<{ send: [body: string]; typing: [value: boolean] }>();
const body = ref("");
let typingTimer: ReturnType<typeof setTimeout> | undefined;
function input() { emit('typing', true); clearTimeout(typingTimer); typingTimer = setTimeout(() => emit('typing', false), 1200); }
function submit() { const clean = body.value.trim(); if (!clean || props.disabled || props.blocked) return; emit('send', clean); body.value = ""; emit('typing', false); }
function keydown(event: KeyboardEvent) { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }
onScopeDispose(() => clearTimeout(typingTimer));
</script>
<template>
  <div v-if="blocked" class="chat-blocked">این گفتگو مسدود شده است. برای ارسال پیام، مسدودسازی را بردارید.</div>
  <form v-else class="chat-composer" @submit.prevent="submit">
    <label class="visually-hidden" for="chat-message-input">متن پیام</label><textarea id="chat-message-input" v-model="body" rows="1" maxlength="4000" placeholder="پیام خود را بنویسید…" :disabled="disabled" @input="input" @keydown="keydown"/>
    <span>{{ body.length.toLocaleString('fa-IR') }}/۴۰۰۰</span><button class="button button-primary" type="submit" :disabled="disabled || !body.trim()">ارسال</button>
  </form>
</template>
