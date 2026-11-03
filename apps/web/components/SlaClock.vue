<script setup lang="ts">const props=defineProps<{dueAt:string;state:string}>();const remaining=computed(()=>{const seconds=Math.max(0,Math.ceil((new Date(props.dueAt).getTime()-Date.now())/1000)),minutes=Math.ceil(seconds/60);return props.state==="breached"?"نقض SLA":minutes<60?`${minutes.toLocaleString("fa-IR")} دقیقه`:`${Math.ceil(minutes/60).toLocaleString("fa-IR")} ساعت`;});</script>
<template><span class="sla-clock" :data-state="state" :aria-label="`وضعیت SLA: ${remaining}`">{{remaining}}</span></template>

