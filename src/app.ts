/**
 * ============================================================================
 * Merge & Choo-Choo - Main Application Entry Point
 * ============================================================================
 * This file bootstraps the entire application and wires up all slices.
 * It follows the modular monolith architecture defined in technical_architecture_doc.md
 * ============================================================================
 */

import { AppState } from '@/types/game';
import { initWorldSlice } from './world';
import { initMinesSlice } from './mines';
import { initStationSlice } from './station';
import { initUISlice, showToast } from './ui';
import { initSaveSlice } from './save';
import { resetSaveData, createDefaultState } from './save';
import { initPlatformSlice } from './platform';
import { initSettingsSlice } from './settings';

// Global execution blocker to explicitly kill ghost double-init tracking loops
let isInitialized = false;

/**
 * Application State (Single Source of Truth)
 */
const appState: AppState = {
  currentTab: 'world',
  devMode: false,
  version: null,
  commitHash: null,
  commitMessage: null,
  navPosition: 'top', // 'top' or 'bottom'

  money: 0,
  mines: {
    activePlot: 0,
    maxUnlockedPlot: 0,
    plots: [], // Your initMinesSlice will handle filling this up
    selectedMiner: null,
    draggedMiner: null,
    lastTick: Date.now()
  }
};

/**
 * DOM Elements Cache (Functional/System Elements)
 */
const dom = {
  get globalMoney() { return document.getElementById('global-money') as HTMLSpanElement | null; },
  get appVersion() { return document.getElementById('app-version') as HTMLDivElement | null; },
  get commitHash() { return document.getElementById('commit-hash') as HTMLElement | null; },
  get themeToggle() { return document.getElementById('themeToggle') as HTMLButtonElement | null; },
  get resetSaveData() { return document.getElementById('resetSaveData') as HTMLButtonElement | null; },
  get devModeToggle() { return document.getElementById('devModeToggle') as HTMLInputElement | null; },
};

/**
 * Application Initialization
 */
export async function initApp(): Promise<AppState> {
  // Guard loop: return the existing state if already initialized
  if (isInitialized) {
    return appState;
  }

  isInitialized = true;

  console.log('[App] Initializing Merge & Choo-Choo...');

  // Initialize platform slice first (runtime adapters)
  await initPlatformSlice(appState);

  // Load version and commit info
  await loadAppInfo();

  // Initialize slices in dependency order
  await initSaveSlice(appState);      // Persistence layer first
  await initWorldSlice(appState);     // World generation
  await initMinesSlice(appState);     // Mining systems
  await initStationSlice(appState);   // Station/logistics systems

  // Initialize UI (navigation, tabs, etc.) and pass state
  initUISlice(appState);

  // Initialize Settings logic (dev mode, theme, save reset)
  initSettingsSlice(appState);

  // Setup functional event listeners
  setupEventListeners();

  // After slices finish loading, draw the current balance
  updateGlobalMoneyUI(appState.money);

  console.log('[App] Initialization complete');

  return appState;
}
async function loadAppInfo(): Promise<void> {
  const baseUrl = import.meta.env.BASE_URL;

  try {
    // 1. Fetch version number
    try {
      const verResponse = await fetch(`${baseUrl}version.txt`);
      if (verResponse.ok) {
        appState.version = (await verResponse.text()).trim();
      } else {
        appState.version = 'unknown';
      }
    } catch (error) {
      appState.version = 'unknown';
    }
    // 2. Fetch git-info.txt
    try {
      const gitResponse = await fetch(`${baseUrl}git-info.txt`);
      if (gitResponse.ok) {
        const gitInfo = await gitResponse.text();
        // Check if the content looks like HTML (indicates a 404 fallback)
        if (gitInfo.trim().startsWith('<!DOCTYPE')) {
          throw new Error('Received HTML fallback instead of text');
        }

        const lines = gitInfo.trim().split('\n');
        appState.commitHash = lines[0] || 'unknown';
        appState.commitMessage = lines[1] || '';
      } else {
        throw new Error(`Failed to fetch git-info: ${gitResponse.status}`);
      }
    } catch (gitError) {
      console.warn('Using fallback commit info');
      appState.commitHash = 'abc123def';
      appState.commitMessage = 'Initial commit';
    }

    // 3. Final DOM Updates
    if (dom.appVersion) dom.appVersion.textContent = appState.version;
    if (dom.commitHash) {
      dom.commitHash.innerHTML = `<span class="hash-value">${appState.commitHash}</span>`;
    }

  } catch (error) {
    console.error('[App] Error loading app info:', error);
    appState.version = 'unknown';
    appState.commitHash = 'unknown';
    if (dom.appVersion) dom.appVersion.textContent = 'unknown';
    if (dom.commitHash) dom.commitHash.textContent = 'unknown';
  }
}

/**
 * Setup Event Listeners
 */
function setupEventListeners(): void {
  // Reset save data button
  dom.resetSaveData?.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all save data? This cannot be undone!')) {
      // 1. Wipe target key from storage safely
      resetSaveData();

      // 2. Load pristine baseline values
      const defaults = createDefaultState();

      // 3. Mutate runtime state in place to trigger downstream component changes
      appState.currentTab = defaults.currentTab;
      appState.devMode = defaults.devMode;
      appState.navPosition = defaults.navPosition;
      appState.money = defaults.money;

      // Force structural re-hydration of the mining layouts
      appState.mines = {
        activePlot: defaults.mines.activePlot,
        maxUnlockedPlot: defaults.mines.maxUnlockedPlot,
        plots: [], // Clears current elements so initMinesSlice rebuilds Plot 1 dynamically
        selectedMiner: null,
        draggedMiner: null,
        lastTick: Date.now()
      };

      // 4. Update core UI elements immediately
      updateGlobalMoneyUI(appState.money);

      const grid = document.getElementById('tile-grid');
      if (grid) grid.innerHTML = ''; // Force clear view container rendering

      showToast('Save data has been reset');
    }
  });

  // Theme toggle (placeholder)
  dom.themeToggle?.addEventListener('click', () => {
    showToast('Theme toggle not yet implemented');
  });

  // Dev mode toggle (placeholder)
  dom.devModeToggle?.addEventListener('change', (event: Event) => {
    const target = event.target as HTMLInputElement;
    appState.devMode = target.checked;

    // Direct DevMode inspector hook
    if (appState.devMode) {
      console.clear(); // Cleans up the console for a fresh read
      console.log('--- 🚀 DEV MODE ACTIVE: CURRENT SAVE DATA SNAPSHOT ---');

      // Forces a perfectly raw, fully expanded text format that never folds or collapses
      console.log(JSON.stringify(appState, null, 2));

      showToast('Dev Mode Active: Save snapshot printed to console');
    }
  });

  // Commit hash click handler
  if (dom.commitHash) {
    dom.commitHash.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('hash-value')) {
        showToast(`Commit: ${target.textContent?.trim()}`);
        if (appState.commitMessage) {
          showToast(appState.commitMessage);
        }
      }
    });
  }
}

/**
 * Synchronize the global money UI display with current state
 */
export function updateGlobalMoneyUI(money: number): void {
  if (dom.globalMoney) {
    dom.globalMoney.textContent = `$${Math.floor(money).toLocaleString()}`;
  }
}

// Bootstrap Application
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initApp();

    // Explicitly hide splash, show app
    const splash = document.getElementById('splash');
    const app = document.getElementById('app');

    if (splash) splash.style.display = 'none';
    if (app) app.style.display = 'block';

    console.log('[App] UI initialized and splash screen removed');
  } catch (err) {
    console.error('[App] Failed to bootstrap:', err);
  }
});

let deferredPrompt: any;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;

  // Show your custom "Install" button in the UI
  const installBtn = document.getElementById('btn-install');
  if (installBtn) installBtn.style.display = 'block';
});

// Trigger the prompt when the user clicks your button
document.getElementById('btn-install')?.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    deferredPrompt = null;
  }
});