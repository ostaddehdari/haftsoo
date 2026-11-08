<script setup lang="ts">
defineProps<{ sbom: number; provenance: number }>()
</script>

<template>
  <section class="security-panel security-coverage">
    <header><h2>امنیت زنجیره تأمین</h2><p>SBOM، Provenance و امضای Artifact</p></header>
    <label>پوشش SBOM <progress :value="sbom" max="10000" /> {{ Math.round(sbom / 100) }}٪</label>
    <label>پوشش Provenance <progress :value="provenance" max="10000" /> {{ Math.round(provenance / 100) }}٪</label>
    <ul><li>Secret Scan پیش از Build</li><li>امضای Keyless مبتنی بر OIDC</li><li>Release Gate برای KEV و Critical</li></ul>
  </section>
</template>
