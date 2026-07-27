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

    it('centers on the padded bounds centroid when locked, even at a non-default scale', () => {
      // width 40, height 20; at scale 2 that's contentW=80/contentH=40, both <= the 100x100
      // viewport, so both axes hit the locked-centered branch (previously only exercised at scale 1).
      const lockedBounds = { minX: -10, maxX: 30, minY: -15, maxY: 5 };
      const result = clampCamera({ x: 999, y: -999, scale: 2 }, lockedBounds, 100, 100);
      // centerX = ((minX+maxX)/2)*scale = ((-10+30)/2)*2 = 20 -> x = -20
      // centerY = ((minY+maxY)/2)*scale = ((-15+5)/2)*2 = -10 -> y = 10
      expect(result.scale).toBe(2);
      expect(result.x).toBe(-20);
      expect(result.y).toBe(10);
    });

    it('refuses to return an unreachable origin-default camera when bounds are asymmetric', () => {
      // Bounds sit entirely to the +x side of the origin, so the "default" (0,0) camera
      // falls outside the legal x range and must be clamped away from 0.
      const asymmetricBounds = { minX: 100, maxX: 400, minY: -20, maxY: 20 };
      const result = clampCamera({ x: 0, y: 0, scale: 1 }, asymmetricBounds, 100, 100);
      // centerX = (100+400)/2 = 250; contentW = 300 > viewportW(100), so panning branch:
      // maxX = -viewportW/2 - centerX + contentW/2 = -50 - 250 + 150 = -150
      // camera.x=0 is above maxX(-150), so it clamps down to -150.
      expect(result.x).toBe(-150);
      expect(result.y).toBeCloseTo(0);
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
