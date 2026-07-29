<!-- /src/components/PwaInstallPrompt.svelte -->
<script lang="ts">
  import { appContext } from '../logic/app/appContext.svelte';
  import { pwaInstallStore } from '../logic/app/pwaInstallStore.svelte';
  import { log } from '../lib/logger';
  import { triggerMobileToast } from './GameTooltip.svelte';

  // Lives outside Splash on purpose: the splash unmounts after 3.5s, and
  // `beforeinstallprompt` usually arrives later than that.
  const deferredPrompt = $derived(pwaInstallStore.current.deferredPrompt);

  async function handleInstallPWA() {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();

    try {
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        appContext.setIsPWAInstalled(true);
        pwaInstallStore.markInstalled();
        triggerMobileToast('App installed! 🎉');
      }
    } catch (err) {
      log.error('PWA', 'Installation error occurred', err as Error);
    } finally {
      pwaInstallStore.clearDeferredPrompt();
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

{#if pwaInstallStore.current.visible}
  <div class="pwa-install-prompt">
    <div class="pwa-content">
      <div class="pwa-icon">
        <svg viewBox="0 0 24 24" width="48" height="48">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" fill="var(--md-sys-color-primary)" />
        </svg>
      </div>

      <div class="pwa-text">
        <h2>Install Mines &amp; Choo-Choos</h2>
        <p>Get the best experience by installing this app to your home screen.</p>

        <div class="pwa-actions">
          <!-- Gated on the captured event, not on a browser-sniffing proxy: if we
               have a deferred prompt the install can actually run, and if we don't
               no amount of feature detection would make it work. -->
          <button class="btn-primary" onclick={handleInstallPWA} disabled={!deferredPrompt}> Install App </button>

          <button class="btn-secondary" onclick={handleOpenStore}> Open Store </button>

          <button
            class="btn-text"
            onclick={() => {
              pwaInstallStore.setVisible(false);
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
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

  .pwa-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

  @media (max-width: 610px) {
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
