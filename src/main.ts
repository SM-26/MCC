// src/main.ts - Main Application Entry Point

import { GameState, Plot, Tile, Miner } from './core/types/state';
import { loadSave, saveGame } from './save/save';
import { generateInitialWorldGrid } from './world/grid';
import { performExploration, generateRandomDestination } from './world/discovery';
import { initializePlotWithTiles } from './mines/plot';

// Global game state
let state: GameState = loadSave();

// Initialize game state if empty
if (!state.plots || state.plots.length === 0) {
  state.plots = [];
  state.worldDiscovered = [];
  state.destinations = [];
}

// Ensure player has an active plot
if (!state.playerPlotId && state.plots.length > 0) {
  state.playerPlotId = state.plots[0].id;
}

// Initialize world grid if empty
if (!state.worldGrid || state.worldGrid.length === 0) {
  state.worldGrid = generateInitialWorldGrid();
}

// Auto-save every 5 seconds
setInterval(() => {
  const saveData = { ...state, _version: 1, _savedAt: Date.now() };
  localStorage.setItem('mcc_save', JSON.stringify(saveData));
}, 5000);

// Export state for use by other modules
export { state, saveGame, loadSave };
