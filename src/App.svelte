<script lang="ts">
  import { onMount } from 'svelte';
  import { appContext, navigation, gameState } from './stores/index.svelte.js';
  import { Tabs } from 'bits-ui';

  const tabConfig: Record<string, { label: string; icon: string }> = {
    world: { label: 'World', icon: '🌍' },
    mine: { label: 'Mine', icon: '⛏️' },
    station: { label: 'Station', icon: '🚉' },
    engineeringIdeas: { label: 'Engineering', icon: '💡' },
    settings: { label: 'Settings', icon: '⚙️' },
  };

  function updateScreenSize() {
    const width = window.innerWidth;
    if (width < 388) {
      appContext.screenSize = 'xs';
    } else if (width < 610) {
      appContext.screenSize = 'sm';
    } else if (width < 1024) {
      appContext.screenSize = 'md';
    } else if (width < 1280) {
      appContext.screenSize = 'lg';
    } else {
      appContext.screenSize = 'xl';
    }
  }

  onMount(() => {
    window.addEventListener('resize', updateScreenSize);
    updateScreenSize();
    setTimeout(() => {
      appContext.isLoading = false;
      appContext.splashVisible = false;
    }, 1000);

    return () => window.removeEventListener('resize', updateScreenSize);
  });

  $effect(() => {
    if (navigation.navbarPosition !== gameState.settings.navbarPosition) {
      gameState.settings.navbarPosition = navigation.navbarPosition;
    }
  });

  const views = {
    world: WorldView,
    mine: MineView,
    station: StationView,
    engineeringIdeas: EngineeringView,
    settings: SettingsView,
  };
</script>

{#snippet WorldView()}
  <div>
    <h2>World Map</h2>
    <p>Train routes and layout go here.</p>
  </div>
{/snippet}

{#snippet MineView()}
  <div>
    <h2>The Mine</h2>
    <p>Manage your miners and extraction plots.</p>
  </div>
{/snippet}

{#snippet StationView()}
  <div>
    <h2>Train Station</h2>
    <p>Upgrade tracks and manage cargo.</p>
  </div>
{/snippet}

{#snippet EngineeringView()}
  <div>
    <h2>Engineering Laboratory</h2>
    <p>Spend your ideas on upgrades.</p>
  </div>
{/snippet}

{#snippet SettingsView()}
  <div>
    <h2>Settings Configuration</h2>
    <p>Theme: {gameState.settings.theme}</p>
  </div>
{/snippet}

<div class="app-container">
  {#if appContext.isLoading || appContext.splashVisible}
    <div class="splash-screen">
      <div class="logo-area">
        <img src="/assets/svelte.svg" alt="Svelte" />
        <img src="/assets/vite.svg" alt="Vite" />
      </div>
      <h1>Merge & Choo-Choo v2</h1>
      <p>A railway tycoon game built with Svelte 5</p>
    </div>
  {/if}

  <div class="app-main">
    <header class="top-bar">
      <h1>Merge & Choo-Choo</h1>
    </header>

    <Tabs.Root bind:value={navigation.activeTab}>
      <Tabs.List class="nav-{navigation.navbarPosition}">
        {#each navigation.tabs as tab}
          {@const config = tabConfig[tab]}

          <Tabs.Trigger value={tab} title={config?.label || tab}>
            <span class="tab-icon">{config?.icon || '🚂'}</span>
            {#if (appContext.screenSize !== 'xs' && appContext.screenSize !== 'sm') || navigation.activeTab === tab}
              <span class="tab-label">{config?.label || tab}</span>
            {/if}
          </Tabs.Trigger>
        {/each}
      </Tabs.List>

      <main class="tab-content">
        {#if views[navigation.activeTab]}
          <Tabs.Content value={navigation.activeTab}>
            {@render views[navigation.activeTab]()}
          </Tabs.Content>
        {:else}
          <div class="placeholder-content"><p>Coming soon...</p></div>
        {/if}
      </main>
    </Tabs.Root>

    <footer class="bottom-bar"></footer>
  </div>
</div>

<style>
  /* 1. Active Tab State */
  :global([role='tab'][data-state='active']) {
    color: var(--mcc-text);
    background: rgba(255, 215, 0, 0.05);
    box-shadow: inset 0 0 0 1px #ffd700;
  }
  /* 2. Global Layout Structure */
  .app-container {
    min-height: 100vh;
    background: var(--mcc-background);
    color: var(--mcc-text);
    font-family: inherit;
    overflow-x: hidden;
  }

  .app-main {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  /* 3. Splash Screen (Destroyed reactively, no .hidden needed) */
  .splash-screen {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--mcc-background);
    z-index: 1000;
    transition: opacity 0.5s ease;
  }
  .logo-area {
    display: flex;
    gap: 24px;
    margin-bottom: 32px;
  }
  .logo-area img {
    height: 64px;
  }
  .splash-screen h1 {
    font-size: 2rem;
    margin: 0 0 8px 0;
  }
  .splash-screen p {
    color: var(--mcc-text-muted);
    margin: 0;
  }

  /* 4. Top Header Layout */
  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: var(--mcc-surface);
    border-bottom: 1px solid var(--mcc-border);
  }
  .top-bar h1 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  /* 5. Navigation Bar & Tabs Mapped to Bits UI Attributes */
  :global([role='tablist']) {
    display: flex;
    width: 100%;
    background: var(--mcc-surface);
    border-bottom: 1px solid var(--mcc-border);
    overflow-x: auto;
    padding: 6px;
    gap: 4px;
  }

  :global([role='tab']) {
    flex: 1;
    min-width: 60px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 12px 8px;
    border: none;
    background: transparent;
    color: var(--mcc-text-muted);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    border-radius: 8px;
  }

  :global([role='tab']:hover:not([data-state='active'])) {
    background: rgba(255, 255, 255, 0.05);
  }

  .tab-icon {
    font-size: 1.5rem;
  }
  .tab-label {
    font-size: 0.75rem;
  }

  /* 6. Active View Shells */
  .tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }
  .placeholder-content {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--mcc-text-muted);
    font-size: 1.25rem;
  }
</style>
