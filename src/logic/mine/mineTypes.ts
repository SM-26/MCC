// src/logic/mine/mineTypes.ts

import type { Station } from '../station/stationTypes';

export type PlotId = string;

export type Ages = 'Mechanical' | 'Steam' | 'Diesel' | 'Electric' | 'Maglev';

export type ResourceType = 'none' | 'money' | 'coal' | 'oil' | 'copper' | 'superalloy';

export type MineTileType = 'empty' | 'dirt' | 'blocker' | 'rubble' | 'coal' | 'oil' | 'copper' | 'superalloy';

export interface AgeResources {
  coal: number; // default: 0
  oil: number; // default: 0
  copper: number; // default: 0
  superalloy: number; // default: 0
}

export interface PlotState {
  plotId: PlotId;
  plotName: string;
  currentAge: Ages; // default: 'Mechanical'
  ageResources: AgeResources;
  northExpansions: NorthExpansion[]; // default: [initial expansion]
  activeNorthExpansionIndex: number; // default: 0
  station: Station | null; // default: null on a new plot
}

export interface NorthExpansion {
  mineDepths: MineDepthState[]; // default: [depth 0]
  selectedMiner: Miner | null; // default: null
  draggedMiner: Miner | null; // default: null
  lastTick: number; // default: Date.now()
  activeDepthIndex: number; // default: 0
}

export interface MineDepthState {
  depth: number; // ground = 0
  rows: number; // grid height, e.g. 5
  cols: number; // grid width, e.g. 5
  tiles: MineTile[][]; // [row][col]
  miners: Miner[]; // default: []
}

export interface MineTile {
  type: MineTileType;
  level: number; // default: 1
  hp: number; // current durability
  maxHp: number; // max durability
  value: number; // payout / yield value, default: 0
  resourceType: ResourceType; // default: 'none'
}

export interface Miner {
  level: number; // default: 1
  tileIndex: number;
  facing: number;
  progress: number; // keep only if mining animation/timing still needs it
}

export function createEmptyAgeResources(): AgeResources {
  return {
    coal: 0,
    oil: 0,
    copper: 0,
    superalloy: 0,
  };
}

export function createMineTile(type: MineTileType = 'empty', overrides: Partial<MineTile> = {}): MineTile {
  const defaultResourceType: ResourceType = type === 'coal' || type === 'oil' || type === 'copper' || type === 'superalloy' ? type : 'none';

  return {
    type,
    level: 1,
    hp: 0,
    maxHp: 0,
    value: 0,
    resourceType: defaultResourceType,
    ...overrides,
  };
}

export function getActiveNorthExpansion(plot: PlotState): NorthExpansion | null {
  return plot.northExpansions[plot.activeNorthExpansionIndex] ?? null;
}

export function getActiveMineDepth(plot: PlotState): MineDepthState | null {
  const expansion = getActiveNorthExpansion(plot);
  if (!expansion) {
    return null;
  }

  return expansion.mineDepths[expansion.activeDepthIndex] ?? null;
}

export function getMineDepthByDepth(expansion: NorthExpansion, depth: number): MineDepthState | null {
  return expansion.mineDepths.find((mineDepth) => mineDepth.depth === depth) ?? null;
}
