/**
 * Save Slice Tests
 * 
 * Validates persistence logic, state creation, and reset functionality.
 */

import { describe, it, expect, vi } from 'vitest';
import { initSaveSlice, createDefaultState, saveGameState, hasSave, resetSaveData } from '../save';
import { AppState } from '../types/game';

describe('Save Slice', () => {
  beforeEach(() => {
    vi.resetModules();
    // Mock localStorage for these tests
    const mockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: mockStorage });
  });

  it('should create a default state with correct initial values', () => {
    const { createDefaultState } = require('../save');
    
    const state = createDefaultState();
    
    expect(state).toBeDefined();
    expect(state.money).toBe(75); // Based on your initial-state.test.ts expectation
    expect(state.navPosition).toBe('top');
    expect(state.devMode).toBe(false);
  });

  it('should initialize save slice and load from localStorage if available', async () => {
    const mockAppState: AppState = {
      currentTab: 'world',
      devMode: false,
      version: null,
      commitHash: null,
      commitMessage: null,
      navPosition: 'top',
      money: 100,
      worldSeed: 12345,
      mines: {
        activePlot: 0,
        plotid: 'A',
        maxUnlockedPlot: 0,
        plots: [],
        selectedMiner: null,
        draggedMiner: null,
        lastTick: Date.now(),
      } as any,
    };

    const mockStorage = window.localStorage;
    
    // Simulate existing save
    mockStorage.getItem.mockReturnValue(JSON.stringify({
      version: 1,
      timestamp: Date.now(),
      data: { money: 500, currentTab: 'mines' }
    }));

    const { initSaveSlice } = await import('../save');
    
    await initSaveSlice(mockAppState);
    
    // Verify it loaded the saved state (mocking the internal logic check)
    expect(mockStorage.getItem).toHaveBeenCalledWith('mcc_save');
  });

  it('should save game state to localStorage', () => {
    const mockAppState: AppState = {
      currentTab: 'mines',
      devMode: false,
      version: '1.0.0',
      commitHash: 'abc123',
      commitMessage: 'Test commit',
      navPosition: 'bottom',
      money: 1500,
      worldSeed: 999,
      mines: {
        activePlot: 1,
        plotid: 'B',
        maxUnlockedPlot: 2,
        plots: [],
        selectedMiner: null,
        draggedMiner: null,
        lastTick: Date.now(),
      } as any,
    };

    const { saveGameState } = require('../save');
    
    saveGameState(mockAppState);
    
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'mcc_save',
      expect.any(String)
    );
  });

  it('should reset save data and clear localStorage', () => {
    const mockStorage = window.localStorage;
    
    // Setup some fake data
    mockStorage.getItem.mockReturnValue(JSON.stringify({ money: 100 }));
    
    const { resetSaveData } = require('../save');
    
    resetSaveData();
    
    expect(mockStorage.removeItem).toHaveBeenCalledWith('mcc_save');
    expect(console.log).toHaveBeenCalledWith('[Save] Save data wiped from storage');
  });

  it('should detect if a save exists', () => {
    const mockStorage = window.localStorage;
    
    // No save
    mockStorage.getItem.mockReturnValue(null);
    const { hasSave } = require('../save');
    expect(hasSave()).toBe(false);
    
    // With save
    mockStorage.getItem.mockReturnValue(JSON.stringify({}));
    expect(hasSave()).toBe(true);
  });
});
