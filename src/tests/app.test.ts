/**
 * Application Entry Point Tests
 * 
 * Validates the main application initialization, info loading, and UI updates.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateGlobalMoneyUI } from '../app';
import { createDefaultState } from '../save';
import { AppState } from '../types/game';

describe('Application Entry Point', () => {
  let mockAppState: Partial<AppState>;

  beforeEach(() => {
    vi.resetModules();

    // Mock DOM elements required by app.ts functions
    const globalMoney = document.createElement('span');
    globalMoney.id = 'global-money';
    document.body.appendChild(globalMoney);

    const appVersion = document.createElement('div');
    appVersion.id = 'app-version';
    document.body.appendChild(appVersion);

    const commitHash = document.createElement('div');
    commitHash.id = 'commit-hash';
    document.body.appendChild(commitHash);

    const resetSaveData = document.createElement('button');
    resetSaveData.id = 'resetSaveData';
    document.body.appendChild(resetSaveData);

    const devModeToggle = document.createElement('input');
    devModeToggle.id = 'devModeToggle';
    document.body.appendChild(devModeToggle);

    mockAppState = {
      currentTab: 'world',
      devMode: false,
      version: null,
      commitHash: null,
      commitMessage: null,
      navPosition: 'top',
      money: 75,
      worldSeed: 123456,
      mines: {
        activePlot: 0,
        maxUnlockedPlot: 0,
        plotid: 'A',
        plots: [],
        selectedMiner: null,
        draggedMiner: null,
        lastTick: Date.now(),
      } as any,
    };
  });

  it('should initialize app and return a valid state', async () => {
    const { initApp } = await import('../app');

    // Mock fetch to avoid network calls during test
    vi.spyOn(window, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      // Convert input to string to safely use .includes()
      const url = input.toString();

      if (url.includes('version.txt')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('1.0.0')
        } as Response);
      }

      if (url.includes('git-info.txt')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('abc123def\nInitial commit')
        } as Response);
      }

      return Promise.reject(new Error('Not found'));
    });

    const state = await initApp();

    expect(state).toBeDefined();
    expect(state.money).toBe(75);
    expect(state.navPosition).toBe('top');
    expect(state.devMode).toBe(false);
  });

  it('should load app info from public/MCC/', async () => {
    const { initApp } = await import('../app');

    // Mock fetch to avoid network calls during test
    vi.spyOn(window, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      // Convert input to string to safely use .includes()
      const url = input.toString();

      if (url.includes('version.txt')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('1.0.0')
        } as Response);
      }

      if (url.includes('git-info.txt')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('abc123def\nInitial commit')
        } as Response);
      }

      return Promise.reject(new Error('Not found'));
    });

    await initApp();

    // Verify DOM elements were updated with fetched data
    const appVersion = document.getElementById('app-version');
    const commitHash = document.getElementById('commit-hash');

    expect(appVersion?.textContent).toBe('2.0.0');
    expect(commitHash?.innerHTML).toContain('def456ghi');
  });

  it('should handle missing version file gracefully', async () => {
    const { initApp } = await import('../app');

    // Mock fetch to simulate missing version file
    vi.spyOn(window, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      // Convert input to string to safely use .includes()
      const url = input.toString();

      if (url.includes('version.txt')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('1.0.0')
        } as Response);
      }

      if (url.includes('git-info.txt')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('abc123def\nInitial commit')
        } as Response);
      }

      return Promise.reject(new Error('Not found'));
    });

    await initApp();

    // Verify app falls back to 'unknown' for version
    const appVersion = document.getElementById('app-version');
    expect(appVersion?.textContent).toBe('unknown');
  });

  it('should handle missing git-info file gracefully', async () => {
    const { initApp } = await import('../app');

    // Mock fetch to simulate missing git-info file
    vi.spyOn(window, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      // Convert input to string to safely use .includes()
      const url = input.toString();

      if (url.includes('version.txt')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('1.0.0')
        } as Response);
      }

      if (url.includes('git-info.txt')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('abc123def\nInitial commit')
        } as Response);
      }

      return Promise.reject(new Error('Not found'));
    });

    await initApp();

    // Verify app falls back to default commit info
    const commitHash = document.getElementById('commit-hash');
    expect(commitHash?.innerHTML).toContain('abc123def');
  });

  it('should update global money UI correctly', () => {
    const mockAppState: AppState = {
      currentTab: 'mines',
      devMode: false,
      version: null,
      commitHash: null,
      commitMessage: null,
      navPosition: 'top',
      money: 1234.567,
      worldSeed: 123456,
      mines: {
        activePlot: 0,
        maxUnlockedPlot: 0,
        plotid: 'A',
        plots: [],
        selectedMiner: null,
        draggedMiner: null,
        lastTick: Date.now(),
      } as any,
    };

    updateGlobalMoneyUI(mockAppState.money);

    const globalMoney = document.getElementById('global-money');
    expect(globalMoney?.textContent).toBe('$1,234');
  });
});
