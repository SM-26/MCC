<script lang="ts">
  import { navigation, appContext } from "$stores/index";
  import AppHeader from "./AppHeader.svelte";

  // Tab configuration
  const tabs = [
    { id: "world", label: "World", emoji: "🌍" },
    { id: "mine", label: "Mine", emoji: "⛏️" },
    { id: "settings", label: "Settings", emoji: "⚙️" },
  ];

  let activeTab = $derived($navigation.activeTab);
  let isLargeScreen = $derived(window.innerWidth >= 400);

  function handleTabChange(tabId: string) {
    $navigation.activeTab = tabId;
  }

  // Handle window resize for responsive navbar
  $effect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      if (newWidth >= 400) {
        // Desktop - show text labels
      } else {
        // Mobile - emojis already shown
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  });
</script>

<nav class="navbar">
  <div class="nav-container">
    <!-- App Logo -->
    <a href="/" class="nav-logo" aria-label="Go to home">
      <img src="/pwa-512x512.png" alt="App Logo" />
    </a>
    
    <!-- Navigation Tabs -->
    <div class="nav-tabs">
      {#if isLargeScreen}
        <!-- Desktop: Show text labels -->
        {#each tabs as tab (tab.id)}
          <button
            class={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onclick={() => handleTabChange(tab.id)}
            aria-label={`Go to ${tab.label} tab`}
          >
            <span class="tab-emoji">{tab.emoji}</span>
            <span class="tab-label">{tab.label}</span>
          </button>
        {/each}
      {:else}
        <!-- Mobile: Show emojis only -->
        {#each tabs as tab (tab.id)}
          <button
            class={`nav-tab nav-tab-emoji ${activeTab === tab.id ? 'active' : ''}`}
            onclick={() => handleTabChange(tab.id)}
            aria-label={`Go to ${tab.label} tab`}
          >
            {tab.emoji}
          </button>
        {/each}
      {/if}
    </div>
  </div>
</nav>

<style>
  .navbar {
    position: sticky;
    top: 0;
    z-index: 1000;
    background-color: var(--md-sys-color-surface);
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
    box-shadow: var(--md-sys-elevation-1);
  }

  .nav-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
    display: flex;
    align-items: center;
    gap: var(--md-sys-spacing-md);
  }

  .nav-logo {
    display: flex;
    align-items: center;
    padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
    border-radius: var(--md-sys-shape-corner-medium);
    transition: background-color var(--md-sys-transition-fast);
  }

  .nav-logo:hover {
    background-color: var(--md-sys-color-surface-container);
  }

  .nav-logo img {
    height: 40px;
    width: auto;
    display: block;
  }

  .nav-tabs {
    display: flex;
    gap: var(--md-sys-spacing-sm);
  }

  .nav-tab {
    padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
    border: none;
    background-color: transparent;
    color: var(--md-sys-color-on-surface-variant);
    font-size: var(--md-sys-typescale-label-large);
    font-weight: 500;
    height: 40px;
    min-width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--md-sys-shape-corner-full);
    transition: all var(--md-sys-transition-fast);
    cursor: pointer;
  }

  .nav-tab:hover {
    background-color: var(--md-sys-color-surface-container);
    color: var(--md-sys-color-on-background);
  }

  .nav-tab.active {
    background-color: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
  }

  .tab-emoji {
    font-size: 24px;
    margin-right: var(--md-sys-spacing-xs);
  }

  .nav-tab-emoji {
    padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
  }

  .nav-tab-emoji .tab-label {
    display: none;
  }

  .nav-tab-emoji .tab-emoji {
    font-size: 28px;
  }

  @media (max-width: 479px) {
    .nav-logo {
      padding: var(--md-sys-spacing-sm);
    }

    .nav-tabs {
      gap: var(--md-sys-spacing-xs);
    }

    .nav-tab-emoji {
      font-size: 28px;
      padding: var(--md-sys-spacing-sm);
    }
  }
</style>
