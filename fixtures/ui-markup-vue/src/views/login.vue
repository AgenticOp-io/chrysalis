<template>
  <main class="login-page">
    <div class="login-card">
      <h1>{{ title }}</h1>
      <p v-if="showHint" class="hint">Enter credentials</p>
      <ul>
        <li v-for="item in items" :key="item.id">{{ item.label }}</li>
      </ul>
      <StatusBadge />
      <button type="button" @click="onSubmit">Sign in</button>
    </div>
  </main>
</template>

<script setup>
const title = "Vue Sign in";
const showHint = true;
const items = [];
function onSubmit() {}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #111827, #1f2937);
}
.login-card {
  background: #1f2937;
  padding: 2rem;
  border-radius: 12px;
}
.hint {
  color: #9ca3af;
}
:deep(.child-slot) {
  color: #e5e7eb;
}
:global(.toast) {
  z-index: 50;
}
</style>
