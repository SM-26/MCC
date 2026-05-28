/**
 * ============================================================================
 * Merge & Choo-Choo - envAdapter Slice
 * ============================================================================
 * Browser, PWA, storage, and runtime adapters.
 * Isolates environment details from game systems.
 * ============================================================================
 */

import { AppState } from '@/types/game';

/**
 * Platform Configuration
 */
export interface PlatformConfig {
  /** Storage key prefix for this app */
  storagePrefix: string;

  /** Whether to enable PWA features */
  enablePWA: boolean;

  /** Offline cache strategy */
  offlineStrategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
}

/**
 * Platform State Interface
 */
export interface PlatformState {
  /** Whether the app is running in a browser */
  isBrowser: boolean;

  /** Whether PWA features are available */
  supportsPWA: boolean;

  /** Current storage adapter type */
  storageType: 'localStorage' | 'indexedDB' | 'none';

  /** Feature detection flags */
  features: {
    serviceWorker: boolean;
    offlineSupport: boolean;
    touchEvents: boolean;
  };

  /** Deferred install prompt (if available) */
  deferredPrompt: any | null;
}

/**
 * Initialize Platform Slice
 * 
 * Sets up browser-specific adapters, feature detection, and PWA handlers.
 * @param appState - The shared application state object
 * @returns Promise that resolves when platform is initialized
 */
export async function initPlatformSlice(appState: AppState): Promise<void> {
  console.log('[Platform] Initializing platform slice...');

  // Detect browser capabilities
  const platformState: PlatformState = {
    isBrowser: true,
    supportsPWA: 'serviceWorker' in navigator,
    storageType: 'localStorage',
    features: {
      serviceWorker: 'serviceWorker' in navigator,
      offlineSupport: 'caches' in window,
      touchEvents: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    },
    deferredPrompt: null,
  };

  // Store platform state for later use
  (window as any).__PLATFORM_STATE__ = platformState;

  console.log('[Platform] Platform initialized:', {
    storageType: platformState.storageType,
    supportsPWA: platformState.supportsPWA,
    features: platformState.features,
  });

  // Setup PWA install prompt handler
  setupPWAPrompts(platformState);
}

/**
 * Setup PWA Install Prompt Handling
 */
function setupPWAPrompts(state: PlatformState): void {
  let deferredPrompt: any;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;

    // Show your custom "Install" button in the UI if it exists
    const installBtn = document.getElementById('btn-install');
    if (installBtn) {
      installBtn.style.display = 'block';
    }
  });

  // Trigger the prompt when the user clicks the install button
  const installBtn = document.getElementById('btn-install');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        deferredPrompt = null;

        // Update platform state
        state.deferredPrompt = null;
      }
    });
  }
}

/**
 * Get current PWA state
 */
export function getPlatformState(): PlatformState | undefined {
  return (window as any).__PLATFORM_STATE__;
}

/**
 * Check if the app is installed as a PWA
 */
export async function isAppInstalled(): Promise<boolean> {
  const state = getPlatformState();
  if (!state) return false;

  // If deferredPrompt exists, it's not yet installed
  if (state.deferredPrompt) return false;

  // Check for the install manifest or similar indicator if needed
  // For now, we assume if no prompt is pending and supportsPWA is true,
  // it might be installed, but this is a best-effort check.
  return !state.deferredPrompt;
}
