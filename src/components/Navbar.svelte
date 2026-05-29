<script lang="ts">
  import { onMount } from "svelte";
  import { navigation, appContext } from "$stores/index";

  let activeTab = $derived($navigation.activeTab);
  let isLargeScreen = $derived(window.innerWidth >= 768);

  const tabLabels: Record<string, string> = {
    world: "World",
    mine: "Mine",
    settings: "Settings",
  };

  const tabEmojis: Record<string, string> = {
    world: "🌍",
    mine: "⛏️",
    settings: "⚙️",
  };

  function handleTabChange(tab: "world" | "mine" | "settings") {
    $navigation.activeTab = tab;
  }

  onMount(() => {
    // Handle window resize for responsive navbar
    const handleResize = () => {
      const newWidth = window.innerWidth;
      if (newWidth >= 768) {
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
    <!-- App Title / Logo -->
    <a
      href="#!"
      class="nav-logo"
      onclick={(e) => {
        e.preventDefault();
        handleTabChange("world");
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="32"
        height="32"
        fill="var(--md-sys-color-primary)"
      >
        <path
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"
        />
      </svg>
      <span class="nav-title">WebGame</span>
    </a>

    <!-- Navigation Tabs -->
    <div class="nav-tabs">
      {#if isLargeScreen}
        <!-- Desktop: Show text labels -->
        <button
          class="nav-tab {activeTab === 'world' ? 'active' : ''}"
          onclick={() => handleTabChange("world")}
        >
          World
        </button>
        <button
          class="nav-tab {activeTab === 'mine' ? 'active' : ''}"
          onclick={() => handleTabChange("mine")}
        >
          Mine
        </button>
        <button
          class="nav-tab {activeTab === 'settings' ? 'active' : ''}"
          onclick={() => handleTabChange("settings")}
        >
          Settings
        </button>
      {:else}
        <!-- Mobile: Show emojis -->
        <button
          class="nav-tab nav-tab-emoji {activeTab === 'world' ? 'active' : ''}"
          onclick={() => handleTabChange("world")}
        >
          {tabEmojis.world}
        </button>
        <button
          class="nav-tab nav-tab-emoji {activeTab === 'mine' ? 'active' : ''}"
          onclick={() => handleTabChange("mine")}
        >
          {tabEmojis.mine}
        </button>
        <button
          class="nav-tab nav-tab-emoji {activeTab === 'settings'
            ? 'active'
            : ''}"
          onclick={() => handleTabChange("settings")}
        >
          {tabEmojis.settings}
        </button>
      {/if}
    </div>

    <!-- Theme Toggle -->
    <button
      class="nav-theme-toggle"
      aria-label="Toggle theme"
      onclick={() =>
        ($appContext.theme = $appContext.theme === "dark" ? "light" : "dark")}
    >
      {#if $appContext.theme === "dark"}
        <!-- Sun icon -->
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="var(--md-sys-color-on-background)"
        >
          <circle cx="12" cy="12" r="5" />
          <path
            d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
          />
        </svg>
      {:else}
        <!-- Moon icon -->
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="var(--md-sys-color-on-background)"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      {/if}
    </button>
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
    gap: var(--md-sys-spacing-sm);
    text-decoration: none;
    color: var(--md-sys-color-on-background);
    font-size: var(--md-sys-typescale-title-large);
    font-weight: 500;
  }

  .nav-title {
    display: none;
  }

  @media (min-width: 480px) {
    .nav-logo {
      padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
      border-radius: var(--md-sys-shape-corner-medium);
      transition: background-color var(--md-sys-transition-fast);
    }

    .nav-logo:hover {
      background-color: var(--md-sys-color-surface-container);
    }

    .nav-title {
      display: inline;
    }
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
  }

  .nav-tab:hover {
    background-color: var(--md-sys-color-surface-container);
    color: var(--md-sys-color-on-background);
  }

  .nav-tab.active {
    background-color: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
  }

  .nav-tab-emoji {
    font-size: 24px;
  }

  .nav-theme-toggle {
    width: 40px;
    height: 40px;
    border: none;
    background-color: transparent;
    color: var(--md-sys-color-on-surface-variant);
    border-radius: var(--md-sys-shape-corner-full);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--md-sys-transition-fast);
  }

  .nav-theme-toggle:hover {
    background-color: var(--md-sys-color-surface-container);
    color: var(--md-sys-color-on-background);
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
