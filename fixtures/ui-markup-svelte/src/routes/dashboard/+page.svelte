<script lang="ts">
  let name = "World";
  let loading = false;
</script>

<div class="dashboard-shell">
  <h1>Hello {name}</h1>
  {#if loading}
    <div class="spinner">Loading</div>
  {/if}
  <TenantGuard>
    <main class="dashboard-main">content</main>
  </TenantGuard>
</div>
