<script>
  const screenSize = $state('md');
  
  function updateScreenSize() {
    const width = window.innerWidth;
    if (width < 576) {
      screenSize = 'xs';
    } else if (width < 768) {
      screenSize = 'sm';
    } else if (width < 1024) {
      screenSize = 'md';
    } else if (width < 1280) {
      screenSize = 'lg';
    } else {
      screenSize = 'xl';
    }
    
    // Update app context
    appContext.update(ctx => ({ ...ctx, screenSize }));
    
    // Update navbar position based on screen size
    navigation.update(nav => ({
      ...nav,
      navbarPosition: nav.navbarPosition === 'top' ? 'bottom' : 'top',
      showActiveLabel: screenSize === 'xs' || screenSize === 'sm'
    }));
  }
  
  onMount(() => {
    window.addEventListener('resize', updateScreenSize);
    updateScreenSize(); // Initial measurement
    
    // Simulate loading complete
    setTimeout(() => {
      appContext.update(ctx => ({ ...ctx, isLoading: false, splashVisible: false }));
    }, 1000);
  });
  
  $effect(() => {
    const navPos = navigation($).navbarPosition;
    if (navPos !== gameState($).settings.navbarPosition) {
      gameState.update(gs => ({
        ...gs,
        settings: { ...gs.settings, navbarPosition: navPos }
      }));
    }
  });
</script>

<div class="app-container">
  <!-- Splash Screen -->
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
  
  <!-- Main App -->
  <div class="app-main">
    <!-- Top Bar (always visible) -->
    <header class="top-bar">
      <h1>Merge & Choo-Choo</h1>
      <div class="top-actions">
        <button class="icon-btn" title="Dev Tools">⚙️</button>
        {#if gameState.settings.devMode}
          <span class="dev-badge">DEV MODE</span>
        {/if}
      </div>
    </header>
    
    <!-- Navigation (position based on screen size) -->
    <nav class={`nav-bar nav-${navigation.navbarPosition}`} role="tablist">
      {#each navigation.tabs as tab, index of tabs}
        <button
          class={`nav-tab ${navigation.activeTab === tab ? 'active' : ''}`}
          role="tab"
          aria-selected={navigation.activeTab === tab}
          on:click={() => navigation.update(nav => ({ ...nav, activeTab: tab }))}
        >
          {#if navigation.showActiveLabel || screenSize !== 'xs'}
            <span class="tab-icon">{getTabIcon(tab)}</span>
            <span class="tab-label">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
          {:else}
            <span class="tab-icon">{getTabIcon(tab)}</span>
          {/if}
        </button>
      {/each}
    </nav>
    
    <!-- Tab Content Area -->
    <main class="tab-content">
      {#if navigation.activeTab === 'settings'}
        <Settings />
      {:else}
        <div class="placeholder-content">
          <p>Coming soon...</p>
        </div>
      {/if}
    </main>
  </div>
</div>

<style>
  .app-container {
    min-height: 100vh;
    background: var(--mcc-background);
    color: var(--mcc-text);
    font-family: inherit;
    overflow-x: hidden;
  }
  
  /* Splash Screen */
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
  
  .splash-screen.hidden {
    opacity: 0;
    pointer-events: none;
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
  
  /* App Main */
  .app-main {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  
  /* Top Bar */
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
  
  .top-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .icon-btn {
    width: 40px;
    height: 40px;
    border: none;
    background: transparent;
    color: var(--mcc-text);
    font-size: 1.25rem;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s ease;
  }
  
  .icon-btn:hover {
    background: var(--mcc-primary);
    color: white;
  }
  
  .dev-badge {
    padding: 4px 12px;
    background: var(--mcc-accent);
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 12px;
    text-transform: uppercase;
  }
  
  /* Navigation Bar */
  .nav-bar {
    display: flex;
    background: var(--mcc-surface);
    border-bottom: 1px solid var(--mcc-border);
    overflow-x: auto;
  }
  
  .nav-top {
    border-bottom: 1px solid var(--mcc-border);
  }
  
  .nav-bottom {
    border-top: 1px solid var(--mcc-border);
    flex-direction: column-reverse;
  }
  
  .nav-tab {
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
  }
  
  .nav-tab.active {
    color: var(--mcc-primary);
    background: rgba(15, 52, 96, 0.1);
  }
  
  .nav-tab:hover:not(.active) {
    background: rgba(255, 255, 255, 0.05);
  }
  
  .tab-icon {
    font-size: 1.5rem;
  }
  
  .tab-label {
    display: none;
  }
  
  /* Tab Content */
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
