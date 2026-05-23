// src/world/grid.ts

import { WorldCell } from '../core/types/state';

export function generateInitialWorldGrid(): WorldCell[] {
  const cells: WorldCell[] = [];
  
  // Center plot (ring 0)
  cells.push(createHexCell('plot-A-I-1', 'Plot A I 1', 'plot', 0, 0));
  
  // Ring 1 (6 hexes)
  for (let i = 0; i < 6; i++) {
    const q = getRing1Coord(i);
    const r = getRing1CoordNext(i);
    const type = i === 3 ? 'city' : i === 0 ? 'factory' : 'fog';
    cells.push(createHexCell(
      `${type}-${i}`,
      type === 'plot' ? '' : `${type.charAt(0).toUpperCase()}${type.slice(1)} ${i + 1}`,
      type,
      q, r
    ));
  }
  
  // Ring 2 (12 hexes) - all fog for now
  for (let i = 0; i < 12; i++) {
    const q = getRing2Coord(i);
    const r = getRing2CoordNext(i);
    cells.push(createHexCell(
      `fog-${i + 6}`,
      '',
      'fog',
      q, r
    ));
  }
  
  return cells;
}

function createRing1Coords(): [number, number][] {
  return [
    [1, -1], [-1, -1], [-2, 0], [-1, 1], [0, 1], [1, 0]
  ];
}

function getRing1Coord(i: number): number {
  const coords = createRing1Coords();
  return coords[i % 6][0];
}

function getRing1CoordNext(i: number): number {
  const coords = createRing1Coords();
  return coords[(i + 1) % 6][1];
}

function getRing2Coords(): [number, number][][] {
  // Simplified ring 2 coordinates for hex grid
  return [
    [[0, -2], [1, -2], [2, -1], [2, 0], [1, 1], [0, 1], [-1, 0], [-2, -1], [-2, 0], [-1, 1], [0, 2], [1, 2]]
  ][0];
}

function getRing2Coord(i: number): number {
  const coords = getRing2Coords();
  return coords[i % 12][0];
}

function getRing2CoordNext(i: number): number {
  const coords = getRing2Coords();
  return coords[(i + 1) % 12][1];
}

export function createHexCell(id: string, name: string, type: string, q: number, r: number): WorldCell {
  return {
    id,
    name,
    type,
    q,
    r,
    discovered: type === 'plot'
  };
}

export function hexPos(q: number, r: number): { left: number; top: number } {
  const size = 78;
  const gapX = 67;
  const gapY = 60;
  
  return {
    left: 160 + q * gapX + (r % 2 ? gapX / 2 : 0),
    top: 70 + r * gapY
  };
}
