/**
 * Mines Slice Tests
 * 
 * Validates the mining logic, miner movement, and plot management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as minesModule from '../mines';
import { AppState } from '../types/game';

describe('Mines Slice', () => {
  let mockAppState: AppState;

  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = `
      <div id="tile-grid"></div>
      <div id="money-display"></div>
      <div id="loc-text"></div>
      <div id="clear-text"></div>
    `;

    mockAppState = {
      money: 100,
      currentTab: 'mines',
      devMode: false,
      navPosition: 'top',
      worldSeed: 12345,
      mines: {
        activePlot: 0,
        plotid: 'A',
        maxUnlockedPlot: 0,
        plots: [{
          depth: 0,
          tiles: Array(25).fill(null).map(() => ({ type: 'empty', level: 1, hp: 0, maxHp: 100, value: 0 })),
          miners: []
        }],
        selectedMiner: null,
        draggedMiner: null,
        lastTick: Date.now(),
      }
    } as any;
  });

  it('should initialize and render grid', async () => {
    await minesModule.initMinesSlice(mockAppState);
    const grid = document.getElementById('tile-grid');
    expect(grid?.children.length).toBe(25);
  });
  it('should initialize mines slice and populate plots', async () => {
    await minesModule.initMinesSlice(mockAppState);

    expect(mockAppState.mines.plots).toBeDefined();
    expect(mockAppState.mines.plots.length).toBeGreaterThan(0);
  });

  it('should decrease money and add miner when buying', () => {
    // Initial cost for 0 miners is 50
    minesModule.handleBuyMiner(mockAppState);

    expect(mockAppState.money).toBe(50); // 100 - 50
    expect(mockAppState.mines.plots[0].miners.length).toBe(1);
  });

  it('should not buy if money is insufficient', () => {
    mockAppState.money = 10;
    minesModule.handleBuyMiner(mockAppState);

    expect(mockAppState.money).toBe(10);
    expect(mockAppState.mines.plots[0].miners.length).toBe(0);
  });
  it('should move the selected miner to an empty tile when clicked', () => {
    // 1. Setup: Select a miner and define an empty tile
    const mockMiner = { level: 1, tileIndex: 5, facing: 0, progress: 0 };
    mockAppState.mines.selectedMiner = mockMiner;
    mockAppState.mines.activePlot = 0;

    // Set up a grid where tile 10 is 'empty'
    mockAppState.mines.plots[0].tiles = Array(25).fill(null).map((_, i) => ({
      type: i === 10 ? 'empty' : 'dirt',
      level: 1, hp: 10, maxHp: 10, value: 0
    }));

    // 2. Perform action: Click on tile 10
    // Note: handleTileClick(tileIndex, appState)
    minesModule.handleTileClick(10, mockAppState);

    // 3. Assert: Miner is now at tileIndex 10 and selection is cleared
    expect(mockMiner.tileIndex).toBe(10);
    expect(mockAppState.mines.selectedMiner).toBeNull();
  });

});
