<script setup lang="ts">
import { statusLabels, type MyPostStatus } from "~/composables/useMyPosts";
defineProps<{ status: MyPostStatus }>();
</script>
<template><span class="post-status-chip" :data-status="status">{{ statusLabels[status] }}</span></template>
