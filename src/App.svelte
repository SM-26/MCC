<script lang="ts">
  import { onMount } from 'svelte';
  import { appContext, navigation, gameState } from './stores/index.svelte';
  import { Tabs } from 'bits-ui';
  import { getScreenSize } from './lib/sizes';
  import Splash from './components/Splash.svelte';
  import { debouncedSave, getSaveSnapshot } from './logic/save.svelte';

  // State flag to prevent the initial boot tracking from triggering an instant disk save
  let isReadyToSave = false;

  const tabConfig: Record<string, { label: string; icon: string }> = {
    world: { label: 'World', icon: '🌍' },
    mine: { label: 'Mine', icon: '⛏️' },
    station: { label: 'Station', icon: '🚉' },
    engineeringIdeas: { label: 'Engineering', icon: '💡' },
    settings: { label: 'Settings', icon: '⚙️' },
  };

  function updateScreenSize() {
    appContext.screenSize = getScreenSize(window.innerWidth);
  }

  onMount(() => {
    // Sync the navigation UI layout state to match whatever was loaded in main.ts
    navigation.navbarPosition = gameState.settings.navbarPosition;

    // Allow a single microtask tick for Svelte's reactivity engine to settle
    // before turning on the autosave listener
    Promise.resolve().then(() => {
      isReadyToSave = true;
    });

    window.addEventListener('resize', updateScreenSize);
    updateScreenSize();

    setTimeout(() => {
      appContext.isLoading = false;
      appContext.splashVisible = false;
    }, 1000);

    return () => window.removeEventListener('resize', updateScreenSize);
  });

  // Effect 1: Handle synchronization between your navigation layout and state settings safely
  $effect(() => {
    const targetPos = navigation.navbarPosition;
    if (gameState.settings.navbarPosition !== targetPos) {
      gameState.settings.navbarPosition = targetPos;
    }
  });

  // Effect 2: Deeply watch the entire state tree for any changes
  $effect(() => {
    // Stringifying a snapshot forces Svelte 5 to watch every deep object/array change
    JSON.stringify(getSaveSnapshot());

    // Exit early if the application is just running its initial dependency registration loop
    if (!isReadyToSave) return;

    debouncedSave();
  });

  const currency = $derived(gameState?.money ?? 0);

  function formatCurrency(amount: number): string {
    return `$${amount}`;
  }
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

{#snippet appHeaderContents(title = 'Mines & Choo-Choo', goldAmount = 0)}
  <h1 class="app-title">{title}</h1>
  <div class="currency-display">
    <span class="currency-icon">🪙</span>
    <span class="currency-value">{formatCurrency(goldAmount)}</span>
  </div>
{/snippet}

<div class="app-container">
  {#if appContext.isLoading || appContext.splashVisible}
    <Splash />
  {/if}

  <div class="app-main" role="application" aria-label="Web Game: Mines and Choo Choos">
    <header class="top-bar">
      {@render appHeaderContents('Mines & Choo-Choo', currency)}
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
        {#if navigation.activeTab === 'world'}
          <Tabs.Content value="world">{@render WorldView()}</Tabs.Content>
        {:else}
          {#if navigation.activeTab === 'mine'}
            <Tabs.Content value="mine">{@render MineView()}</Tabs.Content>
          {:else}
            {#if navigation.activeTab === 'station'}
              <Tabs.Content value="station">{@render StationView()}</Tabs.Content>
            {:else}
              {#if navigation.activeTab === 'engineeringIdeas'}
                <Tabs.Content value="engineeringIdeas">{@render EngineeringView()}</Tabs.Content>
              {:else}
                {#if navigation.activeTab === 'settings'}
                  <Tabs.Content value="settings">{@render SettingsView()}</Tabs.Content>
                {:else}
                  <div class="placeholder-content"><p>Coming soon...</p></div>
                {/if}
              {/if}
            {/if}
          {/if}
        {/if}
      </main>
    </Tabs.Root>

    <footer class="bottom-bar"></footer>
  </div>
</div>

<style>
  /* --- 1. Active Tab State --- */
  :global([role='tab'][data-state='active']) {
    color: var(--mcc-text-main) !important;
    background: rgba(59, 0, 219, 0.08) !important;
    box-shadow: inset 0 0 0 1px var(--mcc-accent, gold) !important;
  }

  /* --- 2. Global Layout Structure --- */
  .app-container {
    min-height: 100vh;
    background: var(--mcc-bg-primary);
    color: var(--mcc-text-main);
    font-family: inherit;
    overflow-x: hidden;
  }

  .app-main {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  /* --- 3. Top Header Layout --- */
  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px var(--spacing-lg, 24px);
    background: var(--mcc-bg-surface);
    border-bottom: 1px solid var(--outline-variant, #49454f);
  }

  .app-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .currency-display {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs, 4px);
    background-color: var(--mcc-bg-primary);
    padding: 6px 12px;
    border-radius: var(--spacing-sm, 8px);
    border: 1px solid var(--mcc-border, rgba(255, 255, 255, 0.05));
  }

  .currency-icon {
    font-size: 1.1rem;
  }

  .currency-value {
    font-weight: 600;
    color: var(--mcc-text-main);
  }

  /* --- 4. Navigation Bar & Tabs --- */
  :global([role='tablist']) {
    display: flex;
    width: 100%;
    background: var(--mcc-bg-surface);
    border-bottom: 1px solid var(--outline, #938f99);
    overflow-x: auto;
    padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
    gap: var(--spacing-xs, 4px);
  }

  :global([role='tab']) {
    flex: 1;
    min-width: 60px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs, 4px);
    padding: 12px var(--spacing-sm, 8px);
    border: none;
    background: transparent;
    color: var(--mcc-text-muted);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    border-radius: var(--spacing-sm, 8px);
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

  /* --- 5. Active View Shells --- */
  .tab-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-lg, 24px);
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
