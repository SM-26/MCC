// src/components/world/worldCamera.test.ts
import { describe, expect, it } from 'vitest';
import { axialToPixel, clampCamera, clampScale, getCellBounds, zoomAtPoint } from './worldCamera';

describe('worldCamera', () => {
  describe('axialToPixel', () => {
    it('places the origin cell at (0,0)', () => {
      expect(axialToPixel({ q: 0, r: 0 })).toEqual({ x: 0, y: 0 });
    });

    it('matches known hex-grid pixel positions', () => {
      expect(axialToPixel({ q: 1, r: 0 })).toEqual({ x: 80, y: 0 });
      expect(axialToPixel({ q: -1, r: 0 })).toEqual({ x: -80, y: 0 });
      expect(axialToPixel({ q: 0, r: 1 })).toEqual({ x: 40, y: 69 });
    });
  });

  describe('clampScale', () => {
    it('clamps below the minimum', () => {
      expect(clampScale(0.1)).toBe(0.5);
    });

    it('clamps above the maximum', () => {
      expect(clampScale(5)).toBe(2.5);
    });

    it('passes through values already in range', () => {
      expect(clampScale(1.2)).toBe(1.2);
    });
  });

  describe('getCellBounds', () => {
    it('returns a padded box around the given cells', () => {
      const cells = [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: -1, r: 0 },
        { q: 0, r: 1 },
      ];

      expect(getCellBounds(cells, 10)).toEqual({ minX: -90, maxX: 90, minY: -10, maxY: 79 });
    });

    it('returns a padding-sized box around the origin when there are no cells', () => {
      expect(getCellBounds([], 10)).toEqual({ minX: -10, maxX: 10, minY: -10, maxY: 10 });
    });
  });

  describe('clampCamera', () => {
    const bounds = { minX: -90, maxX: 90, minY: -10, maxY: 79 };

    it('pulls an out-of-range camera back to the nearest allowed position', () => {
      const result = clampCamera({ x: 1000, y: 500, scale: 1 }, bounds, 100, 100);
      expect(result.x).toBe(40);
      expect(result.y).toBeCloseTo(-34.5);
    });

    it('leaves an in-range camera on the panning axis untouched, and locks the axis that has no slack', () => {
      const result = clampCamera({ x: 20, y: -34.5, scale: 1 }, bounds, 100, 100);
      expect(result.x).toBe(20);
      expect(result.y).toBeCloseTo(-34.5);
    });
  });

  describe('zoomAtPoint', () => {
    it('keeps the world point under the anchor fixed across a scale change', () => {
      const camera = { x: 10, y: 5, scale: 1 };
      const result = zoomAtPoint(camera, 50, 20, 2);

      expect(result.scale).toBe(2);
      expect(result.x).toBe(-30);
      expect(result.y).toBe(-10);

      const worldXBefore = (50 - camera.x) / camera.scale;
      const worldYBefore = (20 - camera.y) / camera.scale;
      expect(result.x + worldXBefore * result.scale).toBeCloseTo(50);
      expect(result.y + worldYBefore * result.scale).toBeCloseTo(20);
    });
  });
});
