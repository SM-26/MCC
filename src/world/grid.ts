// src/world/grid.ts - World Grid Implementation

import { WorldCell } from '../core/types/state';

/**
 * Generate initial 3-ring hex grid (19 hexes total)
 */
export function generateInitialWorldGrid(): WorldCell[] {
  const cells: WorldCell[] = [];
  
  // Center plot (ring 0)
  cells.push({
    id: 'plot-A-I-1',
    name: 'Plot A I 1',
    type: 'plot',
    q: 0,
    r: 0,
    discovered: true
  });
  
  // Ring 1 (6 hexes) - mix of plots, cities, factories
  for (let i = 0; i < 6; i++) {
    const coord = getRing1Coord(i);
    const type = i === 3 ? 'city' : i === 0 ? 'factory' : 'fog';
    cells.push({
      id: `${type}-${i}`,
      name: type === 'plot' ? '' : `${type.charAt(0).toUpperCase()}${type.slice(1)} ${i + 1}`,
      type,
      q: coord[0],
      r: coord[1],
      discovered: false
    });
  }
  
  // Ring 2 (12 hexes) - all fog for now
  for (let i = 0; i < 12; i++) {
    const coord = getRing2Coord(i);
    cells.push({
      id: `fog-${i + 6}`,
      name: '',
      type: 'fog',
      q: coord[0],
      r: coord[1],
      discovered: false
    });
  }
  
  return cells;
}

/**
 * Get coordinates for ring 1 hexes
 */
function getRing1Coord(i: number): [number, number] {
  const coords = [[1, -1], [-1, -1], [-2, 0], [-1, 1], [0, 1], [1, 0]];
  return coords[i % 6];
}

/**
 * Get coordinates for ring 2 hexes
 */
function getRing2Coord(i: number): [number, number] {
  const coords = [
    [0, -2], [1, -2], [2, -1], [2, 0], [1, 1], [0, 1],
    [-1, 0], [-2, -1], [-2, 0], [-1, 1], [0, 2], [1, 2]
  ];
  return coords[i % 12];
}

/**
 * Get hex position in pixels for rendering
 */
export function hexPos(q: number, r: number): { left: number; top: number } {
  const size = 78;
  const gapX = 67;
  const gapY = 60;
  
  return {
    left: 160 + q * gapX + (r % 2 ? gapX / 2 : 0),
    top: 70 + r * gapY
  };
}

/**
 * Check if a hex coordinate is within the world bounds
 */
export function isWithinWorldBounds(q: number, r: number): boolean {
  return Math.abs(q) <= 3 && Math.abs(r) <= 3;
}
