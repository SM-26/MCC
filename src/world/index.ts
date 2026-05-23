// src/world/index.ts

import { WorldCell, Destination } from '../core/types/state';
import { generateInitialWorldGrid, hexPos } from './grid';
import { performExploration, generateRandomDestination } from './discovery';

export interface WorldState {
  discoveredLocations: string[];
  grid: WorldCell[];
}

export function createWorldState(): WorldState {
  return {
    discoveredLocations: ['plot-A-I-1'],
    grid: generateInitialWorldGrid()
  };
}

export function renderWorldGrid(worldGrid: WorldCell[], playerPlotId: string): void {
  const container = document.getElementById('world-map');
  if (!container) return;
  
  container.innerHTML = '';
  
  worldGrid.forEach(cell => {
    const isHidden = cell.type !== 'plot' && !cell.discovered;
    
    const hex = document.createElement('div');
    hex.className = `hex ${cell.type} ${isHidden ? 'hidden' : ''} ${cell.id === playerPlotId ? 'player' : ''}`;
    
    // Calculate hex position using axial coordinates
    const pos = hexPos(cell.q, cell.r);
    hex.style.left = `${pos.left}px`;
    hex.style.top = `${pos.top}px`;
    
    // Add content
    if (cell.type === 'fog') {
      hex.innerHTML = '<div>Fog</div>';
    } else {
      hex.innerHTML = `
        <div>${cell.name || cell.id}</div>
        <div class="small">${cell.type}</div>
      `;
    }
    
    // Add click handler
    hex.onclick = () => {
      if (isHidden) {
        document.getElementById('world-msg')?.textContent = 'Undiscovered.';
        return;
      }
      
      if (cell.type === 'plot') {
        navigateToPlot(cell.id);
      } else if (cell.type === 'city' || cell.type === 'factory') {
        document.getElementById('world-msg')?.textContent = `Selected ${cell.name}`;
      }
    };
    
    container.appendChild(hex);
  });
}
