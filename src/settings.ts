/**
 * ============================================================================
 * Merge & Choo-Choo - Settings System Slice
 * ============================================================================
 * Handles user preferences, dev mode toggle, and save management.
 * ============================================================================
 */

import { AppState } from '@/types/game';
import { showToast } from './ui';

/**
 * Private DOM elements cache for settings slice
 */
const dom = {
  resetBtn: document.getElementById('resetSaveData') as HTMLButtonElement | null,
  themeBtn: document.getElementById('themeToggle') as HTMLButtonElement | null,
  devToggle: document.getElementById('devModeToggle') as HTMLInputElement | null,
  seedInput: document.getElementById('worldSeedInput') as HTMLInputElement | null,
};

/**
 * Initialize Settings Slice
 * 
 * Wires up event listeners and hooks up state bindings.
 * @param appState - The shared application state object
 */
export function initSettingsSlice(appState: AppState): void {
  console.log('[Settings] Initializing features...');

  // Wire up storage cleanup button
  dom.resetBtn?.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all save data?')) {
      localStorage.clear();
      showToast('Save data has been reset');
    }
  });
  // 1. Initialize input value
  if (dom.seedInput) {
    dom.seedInput.value = appState.worldSeed.toString();

    // 2. Set readOnly based on devMode
    dom.seedInput.readOnly = !appState.devMode;

    // 3. Listen for manual changes
    dom.seedInput.addEventListener('change', () => {
      if (appState.devMode) {
        const newSeed = parseInt(dom.seedInput!.value);
        if (!isNaN(newSeed)) {
          appState.worldSeed = newSeed;
          showToast(`Seed updated to: ${newSeed}`);
        }
      }
    });
  }

  // 4. Update interactivity when devMode changes
  dom.devToggle?.addEventListener('change', (event: Event) => {
    const target = event.target as HTMLInputElement;
    appState.devMode = target.checked;

    // Toggle editability of the seed input
    if (dom.seedInput) {
      dom.seedInput.readOnly = !appState.devMode;
    }
  });
}
