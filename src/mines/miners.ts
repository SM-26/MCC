// src/mines/miners.ts

import { Plot, Miner } from '../core/types/state';

export function findBestMinerPlacement(plot: Plot): number | null {
  // Find empty tiles, sort by depth (most negative first)
  const emptyTiles = plot.tiles
    .filter(t => t.type === 'empty')
    .map((t, i) => ({ tile: t, index: i }))
    .sort((a, b) => a.tile.level - b.tile.level); // most negative first
  
  if (emptyTiles.length === 0) return null;
  
  return emptyTiles[0].index;
}

export function placeMiner(plot: Plot, minerLevel: number): Miner {
  const tileIndex = findBestMinerPlacement(plot);
  if (tileIndex === null) throw new Error('No room to place miner');
  
  const facing = getFacingDirection(tileIndex);
  
  return {
    level: minerLevel,
    tileIndex,
    facing
  };
}

export function getFacingDirection(tileIndex: number): number {
  // Simple heuristic: face toward center or nearest target
  const x = tileIndex % 5;
  const y = Math.floor(tileIndex / 5);
  
  if (x < 2) return 0;       // face right
  if (x > 2) return 180;     // face left
  if (y < 2) return 90;      // face down
  return 270;                // face up
}

export function getNeighbors(idx: number): number[] {
  const n = [];
  const x = idx % 5;
  const y = Math.floor(idx / 5);
  
  if (y > 0) n.push(idx - 5);
  if (x < 4) n.push(idx + 1);
  if (y < 4) n.push(idx + 5);
  if (x > 0) n.push(idx - 1);
  
  return n;
}

export function getFacingDirection(from: number, to: number): number {
  const d = to - from;
  if (d === -5) return 0;      // up
  if (d === 1) return 90;      // right
  if (d === 5) return 180;     // down
  if (d === -1) return 270;    // left
  return 0;
}

export function attemptMerge(plot: Plot, selectedMiner: Miner): boolean {
  // Find same-level miner on adjacent tile
  const neighbors = getNeighbors(selectedMiner.tileIndex);
  const targetIndex = neighbors.find(idx => {
    const target = plot.tiles[idx];
    if (target.type !== 'empty') return false;
    
    const existingMiner = plot.miners.find(m => m.tileIndex === idx);
    if (!existingMiner) return false;
    
    return existingMiner.level === selectedMiner.level && 
           existingMiner !== selectedMiner;
  });
  
  if (targetIndex === undefined) return false;
  
  // Perform merge
  const targetMiner = plot.miners.find(m => m.tileIndex === targetIndex)!;
  plot.miners = plot.miners.filter(m => m !== selectedMiner && m !== targetMiner);
  
  // Upgrade existing miner
  targetMiner.level++;
  
  return true;
}

export function buyMiner(plot: Plot): Miner {
  const cost = calculateMinerCost(plot.miners.length);
  if (plot.money < cost) throw new Error('Not enough money');
  
  plot.money -= cost;
  const miner = placeMiner(plot, 1);
  
  return miner;
}

function calculateMinerCost(count: number): number {
  return 50 * Math.pow(1.5, count - 1);
}
