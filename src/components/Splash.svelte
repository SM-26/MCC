<!-- /src/components/Splash.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { appContext } from '../logic/app/appContext.svelte';

  let splashTimeoutId: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    splashTimeoutId = setTimeout(() => {
      appContext.setSplashVisible(false);
    }, 3500);

    // Cleanup splash timeout on unmount
    return () => {
      if (splashTimeoutId) {
        clearTimeout(splashTimeoutId);
        splashTimeoutId = null;
      }
    };
  });
</script>

{#if appContext.current.splashVisible}
  <div class="splash-screen">
    <div class="splash-content">
      <!-- Vite rewrites absolute asset paths in index.html but NOT in component
           markup, so a bare "/favicon.svg" ignores `base` and 404s wherever the
           app isn't served from the domain root (e.g. GitHub Pages /MCC/). -->
      <img src="{import.meta.env.BASE_URL}favicon.svg" alt="MCC Logo" class="splash-logo" draggable="false" />
      <h1 class="splash-title">Mines &amp; Choo-Choos</h1>
      <p class="splash-subtitle">Dig, merge, and build your rail empire from rubble.</p>

      <div class="loading-spinner">
        <svg viewBox="0 0 24 24" width="48" height="48">
          <circle cx="12" cy="12" r="10" stroke="var(--md-sys-color-primary)" stroke-width="3" fill="none" stroke-dasharray="60" stroke-dashoffset="35" />
        </svg>
      </div>

      <button class="close-splash" onclick={() => appContext.setSplashVisible(false)}> Skip </button>
    </div>
  </div>
{/if}

<style>
  /* --- Splash Screen --- */
  .splash-screen {
    position: fixed;
    inset: 0;
    background-color: var(--mcc-bg-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .splash-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .splash-logo {
    width: 120px;
    height: 120px;
    margin-bottom: 24px;
    object-fit: contain;
  }

  .splash-title {
    font-size: 2rem;
    color: var(--mcc-text-main);
    margin: 0 0 12px 0;
  }

  .splash-subtitle {
    font-size: 1rem;
    color: var(--mcc-text-muted);
    margin: 0;
  }

  .loading-spinner {
    margin-top: 24px;
  }

  .loading-spinner svg {
    animation: rotate 1.4s linear infinite;
  }

  .close-splash {
    margin-top: 24px;
    background: transparent;
    border: 2px solid var(--mcc-bg-surface);
    color: var(--mcc-text-main);
    padding: 6px 16px;
    border-radius: 9999px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background 0.2s;
  }

  .close-splash:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  /* --- Animations --- */
  @keyframes rotate {
    100% {
      transform: rotate(360deg);
    }
  }

  /* --- Media Queries --- */
  @media (max-width: 610px) {
    .splash-logo {
      width: 100px;
      height: 100px;
    }
  }
</style>
