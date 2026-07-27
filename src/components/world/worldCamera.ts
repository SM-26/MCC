//
// Pure pan/zoom camera math for WorldGrid.svelte. No Svelte or DOM
// dependencies, so it's unit-testable without mounting the component.

export const HEX_SIZE = 30;
export const HEX_W = 80;
export const HEX_H = 80;

const SCALE_X = HEX_W / (Math.sqrt(3) * HEX_SIZE);
const SCALE_Y = HEX_H / (2 * HEX_SIZE);
const SPACING_X = 1;
const SPACING_Y = 1.15;

export const MIN_SCALE = 0.5;
export const MAX_SCALE = 2.5;

export interface AxialCoord {
  q: number;
  r: number;
}

export interface PixelPos {
  x: number;
  y: number;
}

export interface CameraState {
  x: number;
  y: number;
  scale: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const DEFAULT_CAMERA: CameraState = { x: 0, y: 0, scale: 1 };

/** World-pixel position of a hex cell, relative to the (0,0) origin cell. */
export function axialToPixel(cell: AxialCoord): PixelPos {
  return {
    x: HEX_SIZE * (Math.sqrt(3) * cell.q + (Math.sqrt(3) / 2) * cell.r) * SCALE_X * SPACING_X,
    y: HEX_SIZE * (1.5 * cell.r) * SCALE_Y * SPACING_Y,
  };
}

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Padded bounding box (world-pixel space) around every given cell. */
export function getCellBounds(cells: AxialCoord[], padding: number): Bounds {
  if (cells.length === 0) {
    return { minX: -padding, maxX: padding, minY: -padding, maxY: padding };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const cell of cells) {
    const { x, y } = axialToPixel(cell);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  return { minX: minX - padding, maxX: maxX + padding, minY: minY - padding, maxY: maxY + padding };
}

/**
 * Pull `camera` back inside `bounds` for a viewport of the given size.
 * If the (scaled) content is smaller than the viewport on an axis, that axis
 * is locked centered rather than left free to wander in empty space.
 */
export function clampCamera(camera: CameraState, bounds: Bounds, viewportW: number, viewportH: number): CameraState {
  const scale = clampScale(camera.scale);
  const contentW = (bounds.maxX - bounds.minX) * scale;
  const contentH = (bounds.maxY - bounds.minY) * scale;
  const centerX = ((bounds.minX + bounds.maxX) / 2) * scale;
  const centerY = ((bounds.minY + bounds.maxY) / 2) * scale;

  let x: number;
  if (contentW <= viewportW) {
    x = -centerX;
  } else {
    const minX = viewportW / 2 - centerX - contentW / 2;
    const maxX = -viewportW / 2 - centerX + contentW / 2;
    x = Math.min(Math.max(camera.x, minX), maxX);
  }

  let y: number;
  if (contentH <= viewportH) {
    y = -centerY;
  } else {
    const minY = viewportH / 2 - centerY - contentH / 2;
    const maxY = -viewportH / 2 - centerY + contentH / 2;
    y = Math.min(Math.max(camera.y, minY), maxY);
  }

  return { x, y, scale };
}

/**
 * Recompute camera.x/y so the world-space point currently under
 * (anchorX, anchorY) — screen coordinates relative to the viewport center —
 * stays under that same screen point after switching to `newScale`.
 */
export function zoomAtPoint(camera: CameraState, anchorX: number, anchorY: number, newScale: number): CameraState {
  const scale = clampScale(newScale);
  const worldX = (anchorX - camera.x) / camera.scale;
  const worldY = (anchorY - camera.y) / camera.scale;

  return {
    x: anchorX - worldX * scale,
    y: anchorY - worldY * scale,
    scale,
  };
}
