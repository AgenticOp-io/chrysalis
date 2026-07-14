<template>
  <div class="vue-portal-layout">
    <slot />
  </div>
</template>

<style scoped>
/* portal Nuxt layout — must not leak into /login */
.vue-portal-layout {
  --vue-portal-layout-token: #b45309;
}
</style>
