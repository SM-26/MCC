<script lang="ts">
  import { onMount } from "svelte";
  import { appContext, pwaInstall } from "$stores/index";

  let splashVisible = $derived($appContext.splashVisible);
  // let deferredPrompt: any = null;
  let deferredPrompt: BeforeInstallPromptEvent | null = null;

  onMount(() => {
    // Hide splash screen after fixed duration
    setTimeout(() => {
      $appContext.splashVisible = false;
    }, 2500);

    // Check if running in standalone mode
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;

    if (isStandalone) {
      console.log("PWA: App is already running in standalone mode.");
      return;
    }

    // Listen for PWA installability
    window.addEventListener("beforeinstallprompt", (e: any) => {
      e.preventDefault();
      console.debug("PWA DEBUG: beforeinstallprompt received!");
      deferredPrompt = e;
      // $pwaInstall.visible = true;
      // $pwaInstall.shouldShow = true;
      pwaInstall.update((state) => ({
        ...state,
        visible: true,
        shouldShow: true,
      }));
      console.log("PWA: Installation prompt is available.");
    });

    // Listen for PWA app already installed
    window.addEventListener("appinstalled", () => {
      dismissPWA();
      deferredPrompt = null;
    });

    // If the event never fires, log why it might be missing
    setTimeout(() => {
      if (!deferredPrompt) {
        console.warn("PWA: 'beforeinstallprompt' did not fire.");
        console.info(
          "Possible reasons: 1. Manifest is missing or invalid. 2. Service worker is not active. 3. Browser does not support PWA installation (e.g., iOS Safari). 4. App is already installed.",
        );
      }
    }, 5000);
  });

  function closeSplash() {
    $appContext.splashVisible = false;
  }

  function dismissPWA() {
    $pwaInstall.visible = false;
    $pwaInstall.shouldShow = false;
  }

  async function handleInstallPWA() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    console.log(
      "Attempting to show prompt. DeferredPrompt exists:",
      !!deferredPrompt,
    );
    // Handle the promise separately
    deferredPrompt.userChoice.then(({ outcome }) => {
      if (outcome === "accepted") {
        $appContext.isPWAInstalled = true;
        showToast("App installed! 🎉");
      }
      deferredPrompt = null;
      dismissPWA();
    });
  }

  function showToast(message: string) {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary);
      padding: 16px 24px; border-radius: 12px; z-index: 10000;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function handleOpenStore() {
    const ua = navigator.userAgent.toLowerCase();
    let url =
      ua.includes("iphone") || ua.includes("ipad")
        ? "https://apps.apple.com/app/webgame/id123456789"
        : ua.includes("android")
          ? "https://play.google.com/store/apps/details?id=com.webgame.app"
          : "https://github.com/your-org/webgame/releases";
    window.open(url, "_blank");
  }
</script>

{#if splashVisible}
  <div class="splash-screen">
    <div class="splash-content">
      <img
        src="/favicon.svg"
        alt="WebGame Logo"
        class="splash-logo"
        draggable="false"
      />
      <h1 class="splash-title">WebGame</h1>
      <p class="splash-subtitle">A Material 3 Experience</p>

      <div class="loading-spinner">
        <svg viewBox="0 0 24 24" width="48" height="48">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="var(--md-sys-color-primary)"
            stroke-width="3"
            fill="none"
            stroke-dasharray="60"
            stroke-dashoffset="35"
          />
        </svg>
      </div>
      <button
        class="close-splash"
        onclick={() => ($appContext.splashVisible = false)}
      >
        Skip
      </button>
    </div>
  </div>
{/if}

<!-- PWA Install Prompt -->
{#if $pwaInstall.visible}
  <div class="pwa-install-prompt">
    <div class="pwa-content">
      <div class="pwa-icon">
        <svg viewBox="0 0 24 24" width="48" height="48">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"
            fill="var(--md-sys-color-primary)"
          />
        </svg>
      </div>

      <div class="pwa-text">
        <h2>Install WebGame</h2>
        <p>
          Get the best experience by installing this app to your home screen.
        </p>

        <div class="pwa-actions">
          <button
            class="btn-primary"
            onclick={handleInstallPWA}
            disabled={!("deviceMemory" in navigator)}
          >
            Install App
          </button>

          <button class="btn-secondary" onclick={handleOpenStore}>
            Open Store
          </button>

          <button
            class="btn-text"
            onclick={() => ($pwaInstall.visible = false)}
          >
            Not now
          </button>
        </div>

        <p class="pwa-note">
          <span class="info-icon">ℹ️</span>
          Only available on mobile devices
        </p>
      </div>
    </div>
  </div>
{/if}

<style>
  .splash-screen {
    position: fixed;
    inset: 0;
    background-color: var(--md-sys-color-background);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .splash-content {
    text-align: center;
    animation: fadeInOut 2.5s ease-in-out forwards;
  }

  .splash-logo {
    width: 120px;
    height: 120px;
    margin-bottom: var(--md-sys-spacing-lg);
    object-fit: contain;
  }

  .splash-title {
    font-size: var(--md-sys-typescale-headline-large);
    color: var(--md-sys-color-on-background);
    margin: 0 0 var(--md-sys-spacing-sm) 0;
  }

  .splash-subtitle {
    font-size: var(--md-sys-typescale-body-large);
    color: var(--md-sys-color-on-surface-variant);
    margin: 0;
  }

  .loading-spinner {
    margin-top: var(--md-sys-spacing-lg);
  }

  .pwa-install-prompt {
    position: fixed;
    bottom: calc(var(--md-sys-spacing-md) + env(safe-area-inset-bottom, 0px));
    left: var(--md-sys-spacing-md);
    right: var(--md-sys-spacing-md);
    background-color: var(--md-sys-color-surface-container);
    border-radius: var(--md-sys-shape-corner-large);
    padding: var(--md-sys-spacing-lg);
    box-shadow: var(--md-sys-elevation-3);
    z-index: 9998;
    animation: slideUpFromBottom 0.3s ease-out;
  }

  .pwa-content {
    display: flex;
    gap: var(--md-sys-spacing-md);
    align-items: center;
  }

  .pwa-icon {
    flex-shrink: 0;
  }

  .pwa-text h2 {
    font-size: var(--md-sys-typescale-title-large);
    color: var(--md-sys-color-on-background);
    margin: 0 0 var(--md-sys-spacing-xs) 0;
  }

  .pwa-text p {
    font-size: var(--md-sys-typescale-body-large);
    color: var(--md-sys-color-on-surface-variant);
    margin: 0 0 var(--md-sys-spacing-md) 0;
  }

  .pwa-actions {
    display: flex;
    gap: var(--md-sys-spacing-sm);
    flex-wrap: wrap;
  }

  .pwa-note {
    font-size: var(--md-sys-typescale-body-large);
    color: var(--md-sys-color-on-surface-variant);
    margin-top: var(--md-sys-spacing-sm);
    display: flex;
    align-items: center;
    gap: var(--md-sys-spacing-xs);
  }

  .info-icon {
    font-weight: bold;
  }

  @keyframes fadeInOut {
    0% {
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    90% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  @keyframes slideUpFromBottom {
    0% {
      transform: translateY(100%);
      opacity: 0;
    }
    100% {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @media (max-width: 479px) {
    .splash-logo {
      width: 100px;
      height: 100px;
    }

    .pwa-content {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .pwa-actions {
      width: 100%;
      justify-content: center;
    }
  }
</style>
