<script lang="ts">
  import { navigation } from "$stores/index";
  import WorldView from "../views/WorldView.svelte";
  import SettingsView from "../views/SettingsView.svelte";

  let activeTab = $derived($navigation.activeTab);
</script>

<div class="main-content">
  {#if activeTab === "world"}
    <WorldView />
  {:else if activeTab === "mine"}
    <!-- Mine view placeholder -->
    <main class="content-section">
      <div class="section-header">
        <h2>⛏️ Mine Operations</h2>
        <p class="section-subtitle">
          Manage your mining operations and extract resources
        </p>
      </div>
      <p>Coming soon...</p>
    </main>
  {:else if activeTab === "settings"}
    <SettingsView />
  {:else}
    <p style="color: blue;">No matching tab found!</p>
  {/if}
</div>

<style>
  .main-content {
    flex: 1;
    padding-bottom: calc(
      var(--md-sys-spacing-lg) + env(safe-area-inset-bottom, 0px)
    );
  }
</style>
