// src/station/platforms.ts

import { Station, Platform } from '../core/types/state';

export function createPlatform(stationId: string, level: number): Platform {
  return {
    id: `platform-${stationId}-${level}`,
    level,
    train: null
  };
}

export function getGroundLevel(): number {
  // Ground level is always 1
  return 1;
}

export function getNextUndergroundLevel(currentLevel: number): number {
  // Underground levels are 6, 11, 16, etc.
  return currentLevel + 5;
}

export function getPlatformForLevel(plotDepth: number): Platform | null {
  // Only create platforms at valid levels (divisible by 5, starting from 1)
  if (plotDepth <= 0 || plotDepth % 5 !== 1) return null;
  
  const level = plotDepth;
  const stationId = getStationIdForPlot(plotDepth);
  
  return createPlatform(stationId, level);
}

function getStationIdForPlot(depth: number): string {
  const northExpansion = 0; // Simplified for now
  const undergroundTier = Math.floor((depth - 1) / 5);
  const tierLabel = undergroundTier === 0 ? 'g' : `u${undergroundTier + 1}`;
  
  return `station-plot-A-${getRomanNumeral(northExpansion)}-${tierLabel}`;
}

function getRomanNumeral(num: number): string {
  const numerals: Record<number, string> = {
    0: 'I', 1: 'II', 2: 'III', 3: 'IV', 4: 'V',
    5: 'VI', 6: 'VII', 7: 'VIII', 8: 'IX', 9: 'X'
  };
  return numerals[num] || String(num);
}
