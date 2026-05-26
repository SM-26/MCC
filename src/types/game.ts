/**
 * ============================================================================
 * Merge & Choo-Choo - Core Application State Types
 * ============================================================================
 */

export type TabId = 'world' | 'mines' | 'station' | 'settings';
export type NavPosition = 'top' | 'bottom';

export interface MineTile {
  type: 'empty' | 'rubble' | 'dirt' | 'blocker'; // | 'coal' | 'oil' | 'copper' | 'superalloy' 
  level: number;
  hp: number;
  maxHp: number;
}

export interface Miner {
  level: number;
  tileIndex: number;
  facing: number;
  progress: number;
}

export interface MinePlot {
  depth: number;
  tiles: MineTile[];
  miners: Miner[];
}

export interface MinesState {
  activePlot: number;
  maxUnlockedPlot: number;
  plots: MinePlot[];
  selectedMiner: Miner | null;
  draggedMiner: Miner | null;
  lastTick: number;
}

export interface AppState {
  currentTab: TabId;
  devMode: boolean;
  version: string | null;
  commitHash: string | null;
  commitMessage: string | null;
  navPosition: NavPosition;
  money: number;
  worldSeed: number;
  mines: MinesState;
}