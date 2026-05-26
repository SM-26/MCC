/**
 * ============================================================================
 * Merge & Choo-Choo - Platform Slice
 * ============================================================================
 * Browser, PWA, storage, and runtime adapters.
 * Isolates environment details from game systems.
 * ============================================================================
 */

import { AppState } from '@/types/game';

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
}

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
 * Initialize Platform Slice
 * 
 * Sets up browser-specific adapters and feature detection.
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
  };

  // Store platform state for later use
  (window as any).__PLATFORM_STATE__ = platformState;

  console.log('[Platform] Platform initialized:', {
    storageType: platformState.storageType,
    supportsPWA: platformState.supportsPWA,
    features: platformState.features,
  });
}
