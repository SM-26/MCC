<script lang="ts">
  import { onMount } from 'svelte';
  import { appContext, navigation, gameState } from './stores/index.svelte';
  import { Tabs } from 'bits-ui';
  import { getScreenSize } from './lib/sizes';
  import Splash from './components/Splash.svelte';
  import { debouncedSave, getSaveSnapshot } from './logic/save.svelte';
  import SettingsView from './views/SettingsView.svelte';
  import { toastState } from './components/GameTooltip.svelte';
  import MineView from './views/MineView.svelte';

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
    // Logic: Respect the user's saved preference
    if (gameState.settings.defaultView === 'world') {
      navigation.activeTab = 'world';
    }
    // If 'last-active', we do nothing because navigation.activeTab
    // was already set to the saved value by loadGame() in your save logic.

    window.addEventListener('resize', updateScreenSize);
    updateScreenSize();

    setTimeout(() => {
      appContext.isLoading = false;
      appContext.splashVisible = false;
      isReadyToSave = true;
    }, 2500);

    return () => window.removeEventListener('resize', updateScreenSize);
  });

  $effect(() => {
    // Snapshot everything, including the active tab
    const snapshot = {
      ...getSaveSnapshot(),
      activeTab: navigation.activeTab,
    };

    JSON.stringify(snapshot);

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

{#snippet appHeaderContents(title = 'Mines & Choo-Choo', goldAmount = 0)}
  <h1 class="app-title">{title}</h1>
  <div class="currency-display">
    <span class="currency-icon">🪙</span>
    <span class="currency-value">{formatCurrency(goldAmount)}</span>
  </div>
{/snippet}

{#if toastState.activeText}
  <div class="global-toast-notification">
    <span class="toast-icon">ℹ️</span>
    <p class="toast-content">{toastState.activeText}</p>
  </div>
{/if}

<div class="app-container">
  {#if appContext.isLoading || appContext.splashVisible}
    <Splash />
  {/if}

  <div class="app-main" role="application" aria-label="Web Game: Mines and Choo Choos">
    <header class="top-bar">
      {@render appHeaderContents('Mines & Choo-Choo', currency)}
    </header>

    <Tabs.Root bind:value={navigation.activeTab}>
      <Tabs.List class="nav-{gameState.settings.navbarPosition}">
        {#each navigation.tabs as tab (tab)}
          {@const config = tabConfig[tab] ?? { label: tab, icon: '🚂' }}
          {@const isCompact = appContext.screenSize === 'xs' || appContext.screenSize === 'sm'}
          {@const isVisible = !isCompact || navigation.activeTab === tab}

          <Tabs.Trigger value={tab} title={config.label}>
            <span class="tab-icon">{config.icon}</span>

            {#if isVisible}
              <span class="tab-label">{config.label}</span>
            {/if}
          </Tabs.Trigger>
        {/each}
      </Tabs.List>

      <main class="tab-content">
        <Tabs.Content value="world">{@render WorldView()}</Tabs.Content>
        <Tabs.Content value="mine"><MineView /></Tabs.Content>
        <Tabs.Content value="station">{@render StationView()}</Tabs.Content>
        <Tabs.Content value="engineeringIdeas">{@render EngineeringView()}</Tabs.Content>
        <Tabs.Content value="settings"><SettingsView /></Tabs.Content>
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
    box-shadow: inset 0 0 0 1px gold !important;
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
    padding: var(--spacing-sm) var(--spacing-md);
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
  }

  /* --- 6. Toast --- */
  .global-toast-notification {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #0f172a;
    border: 1px solid #38bdf8;
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.5),
      0 0 12px rgba(56, 189, 248, 0.2);
    padding: 12px 20px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 9999;
    max-width: 90vw;
    animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .toast-icon {
    font-size: 1.1rem;
  }

  .toast-content {
    margin: 0;
    font-size: 0.9rem;
    color: #f3f4f6;
    font-family: monospace;
  }

  @keyframes slideUp {
    from {
      transform: translate(-50%, 12px);
      opacity: 0;
    }
    to {
      transform: translate(-50%, 0);
      opacity: 1;
    }
  }
</style>
