// ============================================================================
// Merge & Choo-Choo - Settings System Slice
// ============================================================================
import { showToast } from './ui.js';

// Private slice elements cache
const dom = {
  resetBtn: document.getElementById('resetSaveData'),
  themeBtn: document.getElementById('themeToggle'),
  devToggle: document.getElementById('devModeToggle')
};

/**
 * Initializes settings event listeners and hooks up state bindings
 * @param {Object} appState - The shared application state object
 */
export function initSettingsSlice(appState) {
  console.log('[Settings] Initializing features...');
  
  // Wire up storage cleanups
  dom.resetBtn?.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all save data?')) {
      localStorage.clear();
      showToast('Save data has been reset');
    }
  });

  // Track dev mode toggle state changes
  dom.devToggle?.addEventListener('change', (e) => {
    // Dynamically change the appState property to true or false
    appState.devMode = e.target.checked;
    
    if (appState.devMode) {
      showToast('Developer Mode Enabled');
      console.log('[App] devMode is now:', appState.devMode);
    } else {
      console.log('[App] devMode is now:', appState.devMode);
    }
  });
}
