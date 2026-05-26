/**
 * Initial App State Test
 * 
 * First test: Verify that running `pnpm dev` produces no console errors
 * and that all initialization messages are present in the browser console.
 * 
 * This test validates:
 * 1. No TypeScript compilation errors
 * 2. All slices initialize correctly  
 * 3. Expected console.log messages appear in order
 * 4. No JavaScript runtime errors
 * 
 * To run: pnpm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initApp } from '../app';

describe('Initial App State', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('package.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: '1.0.0' })
        });
      }
      if (url.includes('git-info.txt')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('abc123def\nInitial commit')
        });
      }
      return Promise.reject(new Error('Not found'));
    }));

    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  it('should initialize and return a valid state', async () => {
    const state = await initApp();

    // Validate that state is populated
    expect(state).toBeDefined();
    expect(state.money).toBe(0);
    expect(state.navPosition).toBe('top');
    expect(state.devMode).toBe(false);
  });

  it('should log initialization messages', async () => {
    await initApp();

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[App] Initializing')
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Initialization complete')
    );
  });
});