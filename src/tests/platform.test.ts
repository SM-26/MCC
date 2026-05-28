/**
 * Platform Slice Tests
 * 
 * Validates PWA state, feature detection, and install prompt handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as platformModule from '../platform';
import { AppState } from '../types/game';

describe('Platform Slice', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button id="btn-install" style="display: none;"></button>';

    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });
    Object.defineProperty(window, 'caches', { value: {}, configurable: true });
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize platform slice and detect browser capabilities', async () => {
    await platformModule.initPlatformSlice({} as AppState);
    const state = platformModule.getPlatformState();
    expect(state?.supportsPWA).toBe(true);
    expect(state?.storageType).toBe('localStorage');
  });

  it('should handle PWA install prompt correctly', async () => {
    await platformModule.initPlatformSlice({} as AppState);

    // Create and dispatch the 'beforeinstallprompt' event
    const event = new Event('beforeinstallprompt');
    (event as any).preventDefault = vi.fn();
    window.dispatchEvent(event);

    // Assert that the button is now visible
    const btn = document.getElementById('btn-install');
    expect(btn?.style.display).toBe('block');
  });

  it('should check if app is installed correctly', async () => {
    await platformModule.initPlatformSlice({} as AppState);

    // 1. Initially, no deferredPrompt means it's considered "installed" (or not installable)
    expect(await platformModule.isAppInstalled()).toBe(true);

    // 2. Simulate pending install (deferredPrompt is set)
    const state = platformModule.getPlatformState();
    if (state) state.deferredPrompt = { prompt: vi.fn() };

    expect(await platformModule.isAppInstalled()).toBe(false);
  });
});