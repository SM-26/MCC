// src/logic/mine/mineTypes.ts

import type { Station } from '../station/stationTypes';
import { cloneStation } from '../station/stationTypes';

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
  currentAge: Ages; // default: 'Mechanical'
  ageResources: AgeResources;
  mineshafts: Mineshaft[]; // default: [initial mineshaft]
  activeMineshaftIndex: number; // default: 0
  station: Station | null; // default: null on a new plot
}

export interface Mineshaft {
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
  const resourceType: ResourceType = type === 'coal' || type === 'oil' || type === 'copper' || type === 'superalloy' ? type : 'none';
  return {
    type,
    level: 1,
    hp: 0,
    maxHp: 0,
    value: 0,
    resourceType,
    ...overrides,
  };
}

export function getActiveMineshaft(plot: PlotState): Mineshaft | null {
  return plot.mineshafts[plot.activeMineshaftIndex] ?? null;
}

export function getActiveMineDepth(plot: PlotState): MineDepthState | null {
  const shaft = getActiveMineshaft(plot);
  return shaft ? (shaft.mineDepths[shaft.activeDepthIndex] ?? null) : null;
}

export function getMineDepthByDepth(mineshaft: Mineshaft, depth: number): MineDepthState | null {
  return mineshaft.mineDepths.find((d) => d.depth === depth) ?? null;
}

export function cloneMineDepthState(depth: MineDepthState): MineDepthState {
  return {
    depth: depth.depth,
    rows: depth.rows,
    cols: depth.cols,
    tiles: depth.tiles.map((row) => row.map((tile) => ({ ...tile }))),
    miners: depth.miners.map((miner) => ({ ...miner })),
  };
}

export function cloneMineshaft(shaft: Mineshaft): Mineshaft {
  return {
    mineDepths: shaft.mineDepths.map(cloneMineDepthState),
    selectedMiner: shaft.selectedMiner ? { ...shaft.selectedMiner } : null,
    draggedMiner: shaft.draggedMiner ? { ...shaft.draggedMiner } : null,
    lastTick: shaft.lastTick,
    activeDepthIndex: shaft.activeDepthIndex,
  };
}

export function clonePlotState(plot: PlotState): PlotState {
  return {
    currentAge: plot.currentAge,
    ageResources: { ...plot.ageResources },
    mineshafts: plot.mineshafts.map(cloneMineshaft),
    activeMineshaftIndex: plot.activeMineshaftIndex,
    station: plot.station ? cloneStation(plot.station) : null,
  };
}

export function createScaffoldPlot(cellId: string): PlotState {
  return {
    currentAge: 'Mechanical',
    ageResources: createEmptyAgeResources(),
    mineshafts: [{ mineDepths: [], selectedMiner: null, draggedMiner: null, lastTick: 0, activeDepthIndex: 0 }],
    activeMineshaftIndex: 0,
    station: null,
  };
}

export function isPlotBuilt(plot: PlotState): boolean {
  const surface = plot.mineshafts[0]?.mineDepths.find((d) => d.depth === 0);
  return !!surface && surface.tiles.length > 0;
}
