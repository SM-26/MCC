/**
 * ============================================================================
 * Merge & Choo-Choo - Core Application State Types
 * ============================================================================
 * This file defines the central AppState interface that orchestrates all
 * system slices. It serves as the single source of truth for application
 * state across the modular monolith architecture.
 * ============================================================================
 */

/**
 * Application State Interface
 * 
 * The central state object that all slices depend on. Contains:
 * - Navigation state (current tab, nav position)
 * - Build information (version, commit hash)
 * - Feature flags (dev mode)
 * 
 * @export
 * @interface AppState
 */
export interface AppState {
  /** Currently active tab ID ('world' | 'mines' | 'station' | 'settings') */
  currentTab: string;

  /** Developer mode flag for enabling debug features */
  devMode: boolean;

  /** Application version from package.json */
  version: string | null;

  /** Git commit hash from git-info.txt */
  commitHash: string | null;

  /** Git commit message from git-info.txt */
  commitMessage: string | null;

  /** Navigation bar position ('top' or 'bottom') */
  navPosition: 'top' | 'bottom';
}

/**
 * Tab IDs - Valid values for currentTab
 */
export type TabId = 'world' | 'mines' | 'station' | 'settings';

/**
 * Navigation Position Types
 */
export type NavPosition = 'top' | 'bottom';

export interface MineTile {
  type: 'empty' | 'rubble' | 'dirt';
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

// Append this property directly inside your existing AppState interface:
export interface AppState {
  money: number;
  mines: MinesState;
  // ... rest of your existing global state fields
}