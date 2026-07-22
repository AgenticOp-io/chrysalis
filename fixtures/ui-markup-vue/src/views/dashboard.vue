<template>
  <main class="dashboard-page">
    <header class="dash-bar">
      <h1>{{ title }}</h1>
      <button type="button" @click="showFilters = true">Filters</button>
    </header>
    <aside v-if="showFilters" class="filters-panel">
      <h2>Filters</h2>
      <button type="button" @click="showFilters = false">Close</button>
    </aside>
    <ul class="item-list">
      <li v-for="row in rows" :key="row.id">{{ row.name }}</li>
    </ul>
    <Modal :visible="showUpgradeModal">
      <template #body>
        <p class="upgrade-copy">Upgrade plan</p>
      </template>
    </Modal>
  </main>
</template>

<script setup>
import { ref } from "vue";
const title = "Vue Dashboard";
const showFilters = ref(false);
const showUpgradeModal = ref(false);
const rows = ref([]);
async function load() {
  const res = await fetch("/api/dashboard/rows");
  rows.value = await res.json();
}
load();
</script>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  background: #0f172a;
  color: #e2e8f0;
}
.dash-bar {
  display: flex;
  justify-content: space-between;
  padding: 1rem 1.5rem;
}
.filters-panel {
  background: #1e293b;
  padding: 1rem;
}
</style>
