// src/logic/tileDefinitions.ts
import type { MineTileType, ResourcesType } from '../../types';

export interface TileDef {
  level: number;
  baseHp: number;
  value: number;
  resourceType: ResourcesType;
}
export const TILE_DEFS: Record<MineTileType, TileDef> = {
  dirt: { level: 1, baseHp: 10, value: 1, resourceType: 'none' },
  rubble: { level: 1, baseHp: 10, value: 10, resourceType: 'money' },
  blocker: { level: 1, baseHp: 0, value: 0, resourceType: 'none' },
  empty: { level: 1, baseHp: 0, value: 0, resourceType: 'none' },
  coal: { level: 1, baseHp: 30, value: 1, resourceType: 'coal' },
  oil: { level: 1, baseHp: 40, value: 1, resourceType: 'oil' },
  copper: { level: 1, baseHp: 50, value: 1, resourceType: 'copper' },
  superalloy: { level: 1, baseHp: 100, value: 1, resourceType: 'superalloy' },
};
