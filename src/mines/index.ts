// src/mines/index.ts

import { Plot, Tile, Miner } from '../core/types/state';
import { initializeTiles, getResourceValue } from './tiles';
import { 
  findBestMinerPlacement, 
  placeMiner, 
  attemptMerge, 
  buyMiner,
  getNeighbors 
} from './miners';

export interface PlotState extends Plot {
  money: number;
}

export function createPlot(plotId: string, northExpansions: number, undergroundLevels: number): PlotState {
  return {
    id: plotId,
    northExpansions,
    undergroundLevels,
    softCleared: false,
    hardCleared: false,
    ageResources: { coal: 0, oil: 0, copper: 0, superAlloy: 0 },
    currentAge: 'basic',
    availableAges: ['basic'],
    stationBuilt: false,
    stationId: null,
    tiles: [],
    miners: []
  };
}

export function digDown(plot: PlotState): void {
  const currentLevel = plot.undergroundLevels;
  const newLevel = currentLevel - 1; // Going deeper (more negative)
  
  plot.undergroundLevels = newLevel;
  plot.tiles = initializeTiles(newLevel, 25);
}

export function buyNorthPlot(plot: PlotState, cost: number = 500): boolean {
  if (plot.money < cost) return false;
  
  plot.money -= cost;
  const newPlot = createPlot(
    `plot-A-${getRomanNumeral(plot.northExpansions + 1)}-${plot.undergroundLevels}`,
    plot.northExpansions + 1,
    plot.undergroundLevels
  );
  
  plot.id = newPlot.id;
  return true;
}

function getRomanNumeral(num: number): string {
  const numerals: Record<number, string> = {
    0: 'I', 1: 'II', 2: 'III', 3: 'IV', 4: 'V',
    5: 'VI', 6: 'VII', 7: 'VIII', 8: 'IX', 9: 'X'
  };
  return numerals[num] || String(num);
}

export function getPlotName(plot: PlotState): string {
  const northLetter = String.fromCharCode(65 + plot.northExpansions); // A, B, C...
  const romanNumeral = getRomanNumeral(plot.northExpansions);
  const depthLabel = plot.undergroundLevels > 0 
    ? `-${Math.abs(plot.undergroundLevels)}` 
    : String(plot.undergroundLevels + 1); // 1 = ground, -1 = level 6
  
  return `Plot ${northLetter} ${romanNumeral}${depthLabel}`;
}

export function getTileTypeDisplay(tile: Tile): string {
  const typeMap: Record<string, string> = {
    'empty': '',
    'rubble': '⛏️',
    'dirt': '🟤',
    'coal': '⚫',
    'oil': '🔴',
    'copper': '🟠',
    'super-alloy': '🟣'
  };
  
  return typeMap[tile.type] || '';
}

export function getTileHealthBar(tile: Tile): string {
  if (tile.hp === 0) return '';
  
  const percentage = (tile.hp / tile.maxHp) * 100;
  const color = percentage > 50 ? '#4CAF50' : percentage > 25 ? '#FF9800' : '#F44336';
  
  return `<div style="background:${color};width:${percentage}%;height:4px;border-radius:2px;"></div>`;
}
