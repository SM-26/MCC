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

  // Track dev mode toggle state changes
  dom.devToggle?.addEventListener('change', (event: Event) => {
    const target = event.target as HTMLInputElement;
    
    // Dynamically change the appState property to true or false
    appState.devMode = target.checked;

    if (appState.devMode) {
      showToast('Developer Mode Enabled');
      console.log('[App] devMode is now:', appState.devMode);
    } else {
      console.log('[App] devMode is now:', appState.devMode);
    }
  });
}
