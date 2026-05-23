// src/station/index.ts

import { Station, Platform, Train } from '../core/types/state';
import { createPlatform, getGroundLevel, getNextUndergroundLevel } from './platforms';
import { 
  createTrain, 
  buyEngine, 
  upgradeEngine, 
  fitCart,
  getEngineCartCapacity 
} from './trains';
import { buyCart, removeCart } from './carts';

export function createStation(plotId: string, northExpansion: number, depth: number): Station {
  const stationId = `station-plot-A-${getRomanNumeral(northExpansion)}-${getUndergroundTier(depth)}`;
  
  return {
    id: stationId,
    plotId,
    platforms: [],
    trainyardInventory: {
      engines: {},
      carts: {}
    }
  };
}

function getRomanNumeral(num: number): string {
  const numerals: Record<number, string> = {
    0: 'I', 1: 'II', 2: 'III', 3: 'IV', 4: 'V',
    5: 'VI', 6: 'VII', 7: 'VIII', 8: 'IX', 9: 'X'
  };
  return numerals[num] || String(num);
}

function getUndergroundTier(depth: number): string {
  const tier = Math.floor((depth - 1) / 5);
  return tier === 0 ? 'g' : `u${tier + 1}`;
}

export function buildStation(plotId: string, northExpansion: number, depth: number): Station {
  const station = createStation(plotId, northExpansion, depth);
  
  // Create platform at ground level (or first valid underground level)
  if (depth % 5 === 1) {
    const platform = createPlatform(station.id, depth);
    station.platforms.push(platform);
  }
  
  return station;
}

export function getStationIdForPlot(plot: Plot): string | null {
  if (!plot.stationBuilt) return null;
  
  const northExpansion = plot.northExpansions;
  const depth = plot.undergroundLevels;
  
  return `station-plot-A-${getRomanNumeral(northExpansion)}-${getUndergroundTier(depth)}`;
}

export function getPlatformLevel(plotDepth: number): number | null {
  if (plotDepth <= 0 || plotDepth % 5 !== 1) return null;
  
  return plotDepth;
}
