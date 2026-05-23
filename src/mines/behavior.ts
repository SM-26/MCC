// src/mines/index.ts (continued - miner behavior)

import { Plot, Tile, Miner } from '../core/types/state';

export function updateMiner(miner: Miner, plot: PlotState, dt: number): void {
  const idx = findTarget(miner, plot);
  if (idx === null) return;
  
  const target = plot.tiles[idx];
  const damage = Math.pow(2, miner.level - 1) * 5 * dt;
  
  miner.facing = getFacingDirection(miner.tileIndex, idx);
  target.hp -= damage;
  
  if (target.hp <= 0) {
    handleTileDestruction(target, plot);
  }
}

export function findTarget(miner: Miner, plot: PlotState): number | null {
  const neighbors = getNeighbors(miner.tileIndex);
  const validTargets = neighbors.filter(i => plot.tiles[i].type !== 'empty');
  
  if (validTargets.length === 0) return null;
  
  // Sort by priority: resource > rubble > dirt, then by HP
  validTargets.sort((a, b) => {
    const A = plot.tiles[a], B = plot.tiles[b];
    
    // Prefer resources over rubble/dirt
    if (A.resourceType && !B.resourceType) return -1;
    if (!A.resourceType && B.resourceType) return 1;
    
    // Same type: prefer lower HP (easier to destroy)
    return A.hp - B.hp;
  });
  
  return validTargets[0];
}

export function handleTileDestruction(tile: Tile, plot: PlotState): void {
  // Add money or resources
  if (tile.resourceType) {
    plot.ageResources[tile.resourceType as keyof typeof plot.ageResources] += tile.value;
  } else {
    plot.money += tile.value;
  }
  
  tile.type = 'empty';
  tile.hp = 0;
}
