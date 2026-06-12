<script lang="ts">
  import { onMount } from 'svelte';
  import { appContext, pwaInstall } from '../stores/index.svelte';
  import { log } from '../lib/logger';
  import { triggerMobileToast } from './GameTooltip.svelte';

  // Custom interface extending the standard DOM Event for modern PWA installations
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
  }

  let deferredPrompt: BeforeInstallPromptEvent | null = $state(null);

  onMount(() => {
    // Hide splash screen after fixed duration
    setTimeout(() => {
      appContext.splashVisible = false;
    }, 3500);

    // Check if running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isStandalone) {
      log.info('PWA', 'App is already running in standalone mode.');
      return;
    }

    // Listen for PWA installability
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      log.debug('PWA', 'beforeinstallprompt received!');
      deferredPrompt = e as BeforeInstallPromptEvent;

      // Mutate your Svelte 5 reactive object directly
      pwaInstall.visible = true;
      pwaInstall.shouldShow = true;
      log.info('PWA', 'Installation prompt is available.');
    });

    // Listen for PWA app already installed
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
    });

    // If the event never fires, log why it might be missing
    setTimeout(() => {
      if (!deferredPrompt) {
        log.warn('PWA', "'beforeinstallprompt' did not fire.");
        log.info(
          'PWA',
          'Possible reasons: 1. Manifest is missing or invalid. 2. Service worker is not active. 3. Browser does not support PWA installation (e.g., iOS Safari). 4. App is already installed.',
        );
      }
    }, 5000);
  });

  async function handleInstallPWA() {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    log.debug('PWA', 'Attempting to show prompt. DeferredPrompt exists:', !!deferredPrompt);

    try {
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        appContext.isPWAInstalled = true;
        triggerMobileToast('App installed! 🎉');
      }
    } catch (err) {
      log.error('PWA', 'Installation error occurred', err as Error);
    } finally {
      deferredPrompt = null;
    }
  }

  function handleOpenStore() {
    const ua = navigator.userAgent.toLowerCase();
    const url =
      ua.includes('iphone') || ua.includes('ipad')
        ? 'https://apps.apple.com/app/webgame/id123456789'
        : ua.includes('android')
          ? 'https://play.google.com/store/apps/details?id=com.webgame.app'
          : 'http://github.com/SM-26/MCC/';
    window.open(url, '_blank');
  }
</script>

{#if appContext.splashVisible}
  <div class="splash-screen">
    <div class="splash-content">
      <img src="/favicon.svg" alt="MCC Logo" class="splash-logo" draggable="false" />
      <h1 class="splash-title">Mines & Choo-Choos</h1>
      <p class="splash-subtitle">Dig, merge, and build your rail empire from rubble.</p>

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
      <button class="close-splash" onclick={() => (appContext.splashVisible = false)}>
        Skip
      </button>
    </div>
  </div>
{/if}

{#if pwaInstall.visible}
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
        <h2>Install Mines & Choo-Choos</h2>
        <p>Get the best experience by installing this app to your home screen.</p>

        <div class="pwa-actions">
          <button
            class="btn-primary"
            onclick={handleInstallPWA}
            disabled={!('deviceMemory' in navigator)}
          >
            Install App
          </button>

          <button class="btn-secondary" onclick={handleOpenStore}> Open Store </button>

          <button class="btn-text" onclick={() => (pwaInstall.visible = false)}> Not now </button>
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

  /* --- PWA Install Prompt --- */
  .pwa-install-prompt {
    position: fixed;
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    left: 16px;
    right: 16px;
    background-color: var(--mcc-bg-surface);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 9998;
    animation: slideUpFromBottom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .pwa-content {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .pwa-icon {
    flex-shrink: 0;
    margin-top: 4px;
  }

  .pwa-text {
    flex-grow: 1;
  }

  .pwa-text h2 {
    font-size: 1.25rem;
    color: var(--mcc-text-main);
    margin: 0 0 8px 0;
  }

  .pwa-text p {
    font-size: 0.95rem;
    color: var(--mcc-text-muted);
    margin: 0 0 16px 0;
  }

  .pwa-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .pwa-actions button {
    padding: 10px 24px;
    border-radius: 9999px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: opacity 0.2s;
  }

  .pwa-actions button:hover {
    opacity: 0.9;
  }

  .pwa-actions .btn-primary {
    background-color: var(--mcc-accent);
    color: #ffffff;
  }

  .pwa-actions .btn-secondary {
    background-color: var(--mcc-bg-primary);
    color: var(--mcc-text-main);
  }

  .pwa-actions .btn-text {
    background: transparent;
    color: var(--mcc-text-main);
  }

  .pwa-note {
    font-size: 0.8rem;
    color: var(--mcc-text-muted);
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* --- Animations --- */
  @keyframes rotate {
    100% {
      transform: rotate(360deg);
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

  /* --- Media Queries --- */
  @media (max-width: 610px) {
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
