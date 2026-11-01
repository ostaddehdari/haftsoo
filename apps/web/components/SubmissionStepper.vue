<script setup lang="ts">
import { submissionSteps, type SubmissionStepKey } from "~/composables/useSubmissionWizard";
defineProps<{ current: SubmissionStepKey; currentIndex: number }>();
const emit = defineEmits<{ select: [step: SubmissionStepKey] }>();
</script>
<template><ol class="submission-stepper" aria-label="مراحل ثبت آگهی"><li v-for="(item,index) in submissionSteps" :key="item.key" :class="{ active: item.key === current, done: index < currentIndex }"><button type="button" :disabled="index > currentIndex + 1" @click="emit('select', item.key)"><span>{{ index + 1 }}</span><strong>{{ item.title }}</strong></button></li></ol></template>
