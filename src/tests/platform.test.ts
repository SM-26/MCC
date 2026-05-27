/**
 * Platform Slice Tests
 * 
 * Validates PWA state, feature detection, and install prompt handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initPlatformSlice, getPlatformState, isAppInstalled } from '../platform';
import { AppState } from '../types/game';

describe('Platform Slice', () => {
  let mockAppState: Partial<AppState>;

  beforeEach(() => {
    vi.resetModules();
    
    // Mock DOM elements required by platform.ts functions
    const installBtn = document.createElement('button');
    installBtn.id = 'btn-install';
    document.body.appendChild(installBtn);

    mockAppState = {
      currentTab: 'world',
      devMode: false,
      version: null,
      commitHash: null,
      commitMessage: null,
      navPosition: 'top',
      money: 0,
      worldSeed: 123456,
      mines: {
        activePlot: 0,
        maxUnlockedPlot: 0,
        plotid: 'A',
        plots: [],
        selectedMiner: null,
        draggedMiner: null,
        lastTick: Date.now(),
      } as any,
    };
  });

  it('should initialize platform slice and detect browser capabilities', async () => {
    const { initPlatformSlice } = await import('../platform');
    
    // Mock navigator to simulate a modern browser with PWA support
    vi.spyOn(navigator, 'serviceWorker', 'get').mockReturnValue({});
    vi.spyOn(window, 'caches', 'get').mockReturnValue({});
    vi.spyOn(navigator, 'maxTouchPoints', 'get').mockReturnValue(0);
    
    await initPlatformSlice(mockAppState as AppState);
    
    // Verify platform state was stored
    const platformState = getPlatformState();
    expect(platformState).toBeDefined();
    expect(platformState.supportsPWA).toBe(true);
    expect(platformState.storageType).toBe('localStorage');
  });

  it('should handle PWA install prompt correctly', async () => {
    const { initPlatformSlice } = await import('../platform');
    
    // Mock navigator to simulate a modern browser with PWA support
    vi.spyOn(navigator, 'serviceWorker', 'get').mockReturnValue({});
    vi.spyOn(window, 'caches', 'get').mockReturnValue({});
    vi.spyOn(navigator, 'maxTouchPoints', 'get').mockReturnValue(0);
    
    // Mock the beforeinstallprompt event
    const mockEvent = new Event('beforeinstallprompt') as any;
    mockEvent.preventDefault = vi.fn();
    mockEvent.prompt = vi.fn().then(() => ({ userChoice: { outcome: 'accepted' } }));
    
    (window as any).addEventListener = vi.fn((event, handler) => {
      if (event === 'beforeinstallprompt') {
        setTimeout(() => handler(mockEvent), 0);
      }
    });
    
    await initPlatformSlice(mockAppState as AppState);
    
    // Verify the install button was shown
    const installBtn = document.getElementById('btn-install');
    expect(installBtn?.style.display).toBe('block');
  });

  it('should check if app is installed correctly', async () => {
    const { initPlatformSlice, isAppInstalled } = await import('../platform');
    
    // Mock navigator to simulate a modern browser with PWA support
    vi.spyOn(navigator, 'serviceWorker', 'get').mockReturnValue({});
    vi.spyOn(window, 'caches', 'get').mockReturnValue({});
    vi.spyOn(navigator, 'maxTouchPoints', 'get').mockReturnValue(0);
    
    await initPlatformSlice(mockAppState as AppState);
    
    // Mock the deferredPrompt to simulate an uninstalled app
    (window as any).__PLATFORM_STATE__ = {
      isBrowser: true,
      supportsPWA: true,
      storageType: 'localStorage',
      features: {
        serviceWorker: true,
        offlineSupport: true,
        touchEvents: false,
      },
      deferredPrompt: { prompt: vi.fn() } // Simulate pending install
    };
    
    const isInstalled = await isAppInstalled();
    expect(isInstalled).toBe(false);
  });
});
