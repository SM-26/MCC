/**
 * Save/Load Logic for Mines & Choo-Choos
 * 
 * Handles debounced autosave to localStorage and reset functionality.
 * All save events are logged via logger.ts for audit trail.
 */

import { gameState } from '$stores/index';
import { log } from '$lib/logger';

// Debounce timer reference
let saveTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Debounced autosave function
 * Saves settings to localStorage after 500ms of inactivity
 */
function debouncedSave(): void {
  // Clear existing timeout
  if (saveTimeoutId) {
    clearTimeout(saveTimeoutId);
  }

  // Set new timeout
  saveTimeoutId = setTimeout(() => {
    const settings = $gameState.settings;
    
    try {
      localStorage.setItem('mcc_settings', JSON.stringify(settings));
      log.info('save', 'Settings saved to localStorage (debounced)');
    } catch (error) {
      log.error('save', `Failed to save settings: ${String(error)}`);
    }
  }, 500); // 500ms debounce
}

/**
 * Load settings from localStorage
 * Called on app initialization
 */
export function loadSettings(): void {
  try {
    const saved = localStorage.getItem('mcc_settings');
    
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // Merge with defaults to ensure all fields exist
      const defaultSettings: Settings = {
        navbarPosition: 'top',
        devMode: false,
        soundEnabled: true,
        notificationsEnabled: true,
      };

      gameState.update((prev) => ({
        ...prev,
        settings: {
          ...defaultSettings,
          ...parsed,
        },
      }));
      
      log.info('save', `Settings loaded from localStorage`);
    } else {
      // No saved settings, use defaults (already set in store init)
      log.debug('save', 'No saved settings found, using defaults');
    }
  } catch (error) {
    log.error('save', `Failed to load settings: ${String(error)}`);
  }
}

/**
 * Save current game state (for future implementation)
 * Currently only saves settings
 */
export function saveGame(): void {
  // TODO: Implement full game state save when needed
  // For now, just save settings
  debouncedSave();
}

/**
 * Reset progress with confirmation
 * Called after user confirms reset dialog
 */
export async function resetProgress(): Promise<void> {
  try {
    log.warn('save', 'Reset progress initiated - clearing all data');
    
    // Clear localStorage
    localStorage.removeItem('mcc_settings');
    localStorage.removeItem('mcc_save'); // Future: full game save
    
    // Reset game state
    gameState.update({
      currentWorld: 1,
      mineLevel: 0,
      settings: {
        navbarPosition: 'top',
        devMode: false,
        soundEnabled: true,
        notificationsEnabled: true,
      },
    });
    
    log.info('save', 'Progress reset successfully');
    
    // Reload page to clear all in-memory state
    window.location.reload();
    
  } catch (error) {
    log.error('save', `Failed to reset progress: ${String(error)}`);
    throw error;
  }
}

/**
 * Get current settings object
 */
export function getSettings(): Settings {
  return $gameState.settings;
}

/**
 * Save settings to localStorage
 */
export function saveSettings(): void {
  try {
    const settings = $gameState.settings;
    localStorage.setItem('mcc_settings', JSON.stringify(settings));
    log.info('save', 'Settings saved to localStorage');
  } catch (error) {
    log.error('save', `Failed to save settings: ${String(error)}`);
  }
}
