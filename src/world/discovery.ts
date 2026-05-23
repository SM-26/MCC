// src/world/discovery.ts

import { Destination } from '../core/types/state';

export function performExploration(): void {
  const undiscovered = state.worldDestinations.filter(d => !d.discovered);
  
  if (undiscovered.length === 0) {
    document.getElementById('world-msg')?.textContent = 'No more destinations to discover.';
    return;
  }
  
  const pick = undiscovered[0];
  pick.discovered = true;
  state.worldDiscovered.push(pick.id);
  
  document.getElementById('world-msg')?.textContent = `Discovered ${pick.name}`;
  saveGame(state);
  renderWorld();
}

export function generateRandomDestination(index: number): Destination {
  const isCity = Math.random() > 0.5;
  const ring = state.explorationsDone < 6 ? 1 : (state.explorationsDone < 18 ? 2 : 3);
  
  return {
    id: `${isCity ? 'city' : 'factory'}-${index}`,
    name: isCity 
      ? `City ${String.fromCharCode(65 + index)}` 
      : `Factory ${index + 1}`,
    type: isCity ? 'city' : 'factory',
    distance: Math.floor(Math.random() * 5) + (ring * 10),
    basePayout: isCity ? 120 : 180,
    discovered: false
  };
}

export function getExplorationStats(): { ring: number; distance: number } {
  const ring = state.explorationsDone < 6 ? 1 : (state.explorationsDone < 18 ? 2 : 3);
  return { ring, distance: ring * 10 };
}
