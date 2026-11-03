<script setup lang="ts">const props=defineProps<{score:number}>();const level=computed(()=>props.score>=.85?"critical":props.score>=.55?"review":"safe");</script>
<template><span class="risk-score-badge" :data-level="level" :aria-label="`امتیاز ریسک ${Math.round(score*100)} از ۱۰۰`">{{Math.round(score*100)}}</span></template>
