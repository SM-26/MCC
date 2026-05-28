import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as saveModule from '../save';
import { AppState } from '../types/game';

describe('Save Slice', () => {
  // Define mock outside beforeEach to ensure persistence
  const mockStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });

    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true
    });
  });

  it('should create a default state with correct initial values', () => {
    const state = saveModule.createDefaultState();
    expect(state.money).toBe(75);
    expect(state.navPosition).toBe('top');
  });

  it('should initialize save slice and load from localStorage', async () => {
    const mockAppState: AppState = saveModule.createDefaultState();

    mockStorage.getItem.mockReturnValue(JSON.stringify({
      version: 1,
      data: { money: 500 }
    }));

    await saveModule.initSaveSlice(mockAppState);
    expect(mockAppState.money).toBe(500);
  });

  it('should save game state to localStorage', () => {
    const state = saveModule.createDefaultState();
    saveModule.saveGameState(state);
    expect(mockStorage.setItem).toHaveBeenCalledWith('mcc_save', expect.any(String));
  });

  it('should detect if a save exists', () => {
    mockStorage.getItem.mockReturnValue(null);
    expect(saveModule.hasSave()).toBe(false);

    mockStorage.getItem.mockReturnValue('{}');
    expect(saveModule.hasSave()).toBe(true);
  });

  it('should detect negative money and trigger corruption handler', () => {
    // Ensure we don't actually reload the page during the test
    const spy = vi.spyOn(saveModule, 'handleCorruptedSave').mockImplementation(() => { });

    const corruptedState = saveModule.createDefaultState();
    corruptedState.money = -50;

    const result = saveModule.validateState(corruptedState);

    expect(result).toBe(false);
    expect(spy).toHaveBeenCalledWith('Negative balance');
  });
});