<!-- /src/App.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Tabs } from 'bits-ui';

  import type { TabId } from './logic/app/navigationTypes';

  import { appContext } from './logic/app/appContext.svelte';
  import { gameState } from './logic/app/gameState.svelte';
  import { navigation } from './logic/app/navigationStore.svelte';

  import { getScreenSize } from './lib/sizes';
  import { debouncedSave } from './logic/save/save.svelte';

  import Splash from './components/Splash.svelte';
  import { toastState } from './components/GameTooltip.svelte';

  import WorldView from './views/WorldView.svelte';
  import MineView from './views/MineView.svelte';
  import SettingsView from './views/SettingsView.svelte';
  import { log } from './lib/logger';

  let isReadyToSave = false;
  let lastAutosaveSignature = '';
  let currentTab = $state<TabId>(navigation.current.activeTab);

  const tabConfig: Record<TabId, { label: string; icon: string }> = {
    world: { label: 'World', icon: '🌍' },
    mine: { label: 'Mine', icon: '⛏️' },
    station: { label: 'Station', icon: '🚉' },
    engineering: { label: 'Engineering', icon: '💡' },
    settings: { label: 'Settings', icon: '⚙️' },
  };

  const effectiveNavbarPosition = $derived(gameState.current.settings.navbarPosition === 'bottom' ? 'bottom' : 'top');

  function updateScreenSize() {
    appContext.setScreenSize(getScreenSize(window.innerWidth));
  }

  function buildAutosaveSignature(): string {
    return [
      gameState.current.money,
      navigation.current.activeTab,
      gameState.current.settings.navbarPosition,
      gameState.current.settings.defaultView,
      gameState.current.settings.devMode,
      gameState.current.settings.soundEnabled,
      gameState.current.settings.notificationsEnabled,
      gameState.current.settings.theme,
      gameState.current.settings.worldSeed,
    ].join('|');
  }

  function queueAutosave(reason: string) {
    if (!isReadyToSave) return;

    const signature = buildAutosaveSignature();
    if (signature === lastAutosaveSignature) return;

    lastAutosaveSignature = signature;

    log.debug(
      'autosave',
      `${reason}: activeTab=${navigation.current.activeTab}, navbarPosition=${gameState.current.settings.navbarPosition}, defaultView=${gameState.current.settings.defaultView}, theme=${gameState.current.settings.theme}`,
    );
    debouncedSave();
  }

  function handleTabChange(tab: TabId) {
    if (tab === currentTab) return;

    currentTab = tab;
    navigation.setActiveTab(tab);

    if (!isReadyToSave) return;

    log.debug('autosave', `view changed: activeTab=${tab}`);
    queueAutosave('view changed');
  }

  onMount(() => {
    log.debug('app', `onMount start: defaultView=${gameState.current.settings.defaultView}, activeTab=${navigation.current.activeTab}`);

    if (gameState.current.settings.defaultView === 'world') {
      currentTab = 'world';
      navigation.setActiveTab('world');
      log.debug('app', 'forced activeTab=world because defaultView=world');
    } else {
      currentTab = navigation.current.activeTab;
      log.debug('app', `keeping loaded activeTab=${navigation.current.activeTab} because defaultView=last-active`);
    }

    window.addEventListener('resize', updateScreenSize);
    updateScreenSize();

    const splashTimer = window.setTimeout(() => {
      appContext.setIsLoading(false);
      appContext.setSplashVisible(false);
      isReadyToSave = true;
      lastAutosaveSignature = buildAutosaveSignature();
      log.debug('app', `save ready: activeTab=${navigation.current.activeTab}, navbarPosition=${gameState.current.settings.navbarPosition}`);
    }, 2500);

    return () => {
      window.clearTimeout(splashTimer);
      window.removeEventListener('resize', updateScreenSize);
    };
  });

  $effect(() => {
    if (!isReadyToSave) return;

    void gameState.current.money;
    void gameState.current.settings.navbarPosition;
    void gameState.current.settings.defaultView;
    void gameState.current.settings.devMode;
    void gameState.current.settings.soundEnabled;
    void gameState.current.settings.notificationsEnabled;
    void gameState.current.settings.theme;
    void gameState.current.settings.worldSeed;

    queueAutosave('settings changed');
  });

  const currency = $derived(gameState.current.money ?? 0);

  function formatCurrency(amount: number): string {
    return `$${amount}`;
  }
</script>

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
  {#if appContext.current.isLoading || appContext.current.splashVisible}
    <Splash />
  {/if}

  <div class="app-main" role="application" aria-label="Web Game: Mines and Choo Choos">
    <header class="top-bar">
      {@render appHeaderContents('Mines & Choo-Choo', currency)}
    </header>

    <Tabs.Root value={currentTab} onValueChange={(value) => handleTabChange(value as TabId)} class="tabs-root nav-pos-{effectiveNavbarPosition}">
      {#if effectiveNavbarPosition === 'top'}
        <Tabs.List class="navtab-list navtab-top">
          {#each navigation.current.tabs as tab (tab)}
            {@const config = tabConfig[tab] ?? { label: tab, icon: '🚂' }}
            {@const isCompact = appContext.current.screenSize === 'xs' || appContext.current.screenSize === 'sm'}
            {@const isVisible = !isCompact || currentTab === tab}

            <Tabs.Trigger value={tab} title={config.label}>
              <span class="tab-icon">{config.icon}</span>
              {#if isVisible}
                <span class="tab-label">{config.label}</span>
              {/if}
            </Tabs.Trigger>
          {/each}
        </Tabs.List>
      {/if}

      <div class="tabs-panels">
        <Tabs.Content value="world" class="tab-panel"><WorldView /></Tabs.Content>
        <Tabs.Content value="mine" class="tab-panel"><MineView /></Tabs.Content>
        <Tabs.Content value="station" class="tab-panel">{@render StationView()}</Tabs.Content>
        <Tabs.Content value="engineering" class="tab-panel">{@render EngineeringView()}</Tabs.Content>
        <Tabs.Content value="settings" class="tab-panel"><SettingsView /></Tabs.Content>
      </div>

      {#if effectiveNavbarPosition === 'bottom'}
        <Tabs.List class="navtab-list navtab-bottom">
          {#each navigation.current.tabs as tab (tab)}
            {@const config = tabConfig[tab] ?? { label: tab, icon: '🚂' }}
            {@const isCompact = appContext.current.screenSize === 'xs' || appContext.current.screenSize === 'sm'}
            {@const isVisible = !isCompact || currentTab === tab}

            <Tabs.Trigger value={tab} title={config.label}>
              <span class="tab-icon">{config.icon}</span>
              {#if isVisible}
                <span class="tab-label">{config.label}</span>
              {/if}
            </Tabs.Trigger>
          {/each}
        </Tabs.List>
      {/if}
    </Tabs.Root>
  </div>
</div>

<style>
  /* --- 1. Global Layout Structure --- */
  .app-container {
    height: 100dvh;
    background: var(--mcc-bg-primary);
    color: var(--mcc-text-main);
    font-family: inherit;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .app-main {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-height: 0;
    overflow: hidden;
  }

  /* --- 2. Top Header Layout --- */
  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--mcc-bg-surface);
    border-bottom: 1px solid var(--outline-variant, #49454f);
    flex: 0 0 auto;
  }

  .app-title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .currency-display {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs, 4px);
    background-color: var(--mcc-bg-primary);
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid var(--mcc-border, rgba(255, 255, 255, 0.06));
  }

  /* --- 3. Navigation Shell --- */
  :global(.tabs-root) {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-height: 0;
    width: 100%;
  }

  .tabs-panels {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  /* --- 4. Navtab Bar --- */
  :global(.navtab-list) {
    display: flex;
    flex: 0 0 auto;
    flex-direction: row;
    width: 100%;
    gap: 6px;
    padding: 6px 8px;
    background: var(--mcc-bg-surface);
    overflow-x: auto;
    scrollbar-width: none;
  }

  :global(.navtab-list::-webkit-scrollbar) {
    display: none;
  }

  :global(.tab-icon) {
    font-size: 1.22rem;
    line-height: 1;
  }

  :global(.navtab-top) {
    border-bottom: 1px solid var(--outline, #938f99);
  }

  :global(.navtab-bottom) {
    border-top: 1px solid var(--outline, #938f99);
    padding-bottom: max(6px, env(safe-area-inset-bottom));
    box-shadow: 0 -6px 18px rgba(0, 0, 0, 0.18);
  }

  :global([role='tab']) {
    position: relative;
    flex: 1 1 0;
    min-width: 0;
    min-height: 44px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 10px 10px 9px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--mcc-text-muted);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition:
      background-color 0.18s ease,
      border-color 0.18s ease,
      color 0.18s ease,
      transform 0.12s ease;
  }

  :global([role='tab']:hover) {
    background: rgba(255, 255, 255, 0.035);
    color: var(--mcc-text-main);
  }

  :global([role='tab']:focus-visible) {
    outline: none;
    border-color: color-mix(in srgb, gold 45%, rgba(255, 255, 255, 0.16));
    box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.14);
  }

  :global([role='tab'][data-state='active']) {
    background: color-mix(in srgb, var(--mcc-accent, #3b00db) 10%, transparent);
    color: var(--mcc-text-main);
    border-color: color-mix(in srgb, gold 50%, rgba(255, 255, 255, 0.12));
  }

  :global(.navtab-top [role='tab'][data-state='active']::after) {
    content: '';
    position: absolute;
    left: 10px;
    right: 10px;
    bottom: 3px;
    height: 2px;
    border-radius: 999px;
    background: gold;
    opacity: 0.95;
  }

  :global(.navtab-bottom [role='tab'][data-state='active']::before) {
    content: '';
    position: absolute;
    left: 10px;
    right: 10px;
    top: 3px;
    height: 2px;
    border-radius: 999px;
    background: gold;
    opacity: 0.95;
  }

  :global([role='tab'][data-disabled]) {
    opacity: 0.45;
    cursor: not-allowed;
  }

  :global([role='tabpanel']) {
    display: none;
    flex: 1 1 0;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  :global([role='tabpanel'][data-state='active']) {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  :global(.tab-panel) {
    display: none;
    flex: 1 1 0;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  :global(.tab-panel[data-state='active']) {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  /* --- 5. Toast --- */
  .global-toast-notification {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #0f172a;
    border: 1px solid #38bdf8;
    padding: 12px 20px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 9999;
    max-width: 90vw;
  }

  @media (max-width: 640px) {
    :global(.navtab-list) {
      gap: 4px;
      padding: 6px;
    }

    :global(.navtab-bottom) {
      padding-bottom: max(8px, env(safe-area-inset-bottom));
    }

    :global([role='tab']) {
      min-height: 42px;
      padding: 9px 8px 8px;
      font-size: 0.7rem;
    }
  }
</style>
