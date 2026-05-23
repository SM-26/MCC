// src/main.ts - Main Application Entry Point

import { GameState } from './core/types/state';
import { loadSave, saveGame } from './save/save';
import { generateInitialWorldGrid } from './world/grid';

// Global game state
let state: GameState = loadSave();

// Initialize game state if empty
if (!state.plots || state.plots.length === 0) {
  try {
    state.plots = [];
    state.worldDiscovered = [];
    state.destinations = [];
  } catch (error) {
    console.error('Failed to initialize game state:', error);
  }
}

// Ensure player has an active plot
if (!state.playerPlotId && state.plots.length > 0) {
  try {
    state.playerPlotId = state.plots[0].id;
  } catch (error) {
    console.error('Failed to set player plot:', error);
  }
}

// Initialize world grid if empty
if (!state.worldGrid || state.worldGrid.length === 0) {
  try {
    state.worldGrid = generateInitialWorldGrid();
  } catch (error) {
    console.error('Failed to generate world grid:', error);
  }
}

// Auto-save every 5 seconds with error handling
let saveInterval: NodeJS.Timeout | null = null;
try {
  saveInterval = setInterval(() => {
    try {
      const saveData = { ...state, _version: 1, _savedAt: Date.now() };
      localStorage.setItem('mcc_save', JSON.stringify(saveData));
    } catch (error) {
      console.error('Failed to auto-save:', error);
    }
  }, 5000);
} catch (error) {
  console.error('Failed to set up auto-save:', error);
}

// Export state for use by other modules
export { state, saveGame, loadSave };
