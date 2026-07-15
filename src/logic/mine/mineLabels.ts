// src/logic/mine/mineLabels.ts

import type { AgeResources, MineTileType } from './mineTypes';
import CoalImg from '../../assets/Coal.webp';
import OilImg from '../../assets/Oil.webp';
import CopperImg from '../../assets/Copper.webp';
import SuperAlloyImg from '../../assets/Super_Alloy.webp';

export type ResourceKey = keyof AgeResources;

/** Age-progression order: Coal → Oil → Copper → Super-Alloy. */
export const RESOURCE_KEYS: ResourceKey[] = ['coal', 'oil', 'copper', 'superalloy'];

/** Resource art (webp) + labels, keyed by tile/resource type. */
export const RESOURCE_META: Partial<Record<MineTileType, { img: string; label: string }>> = {
  coal: { img: CoalImg, label: 'Coal' },
  oil: { img: OilImg, label: 'Oil' },
  copper: { img: CopperImg, label: 'Copper' },
  superalloy: { img: SuperAlloyImg, label: 'Super-Alloy' },
};

export function toRoman(num: number): string {
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const numerals = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];

  let result = '';
  let remaining = num;

  for (let i = 0; i < values.length; i++) {
    while (remaining >= values[i]) {
      result += numerals[i];
      remaining -= values[i];
    }
  }

  return result;
}

export function getExpansionLabel(activeNorthExpansionIndex: number): string {
  return activeNorthExpansionIndex === 0 ? 'none' : toRoman(activeNorthExpansionIndex);
}

export function getPlotLabel(plotName: string | null | undefined, plotIndex: number): string {
  if (plotName && plotName.trim().length > 0) {
    return plotName;
  }
  return plotIndex === 0 ? 'Prague' : `Plot ${plotIndex}`;
}
