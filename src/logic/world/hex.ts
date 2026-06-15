// src/logic/world/hex.ts
/**
 * Axial hex coordinate math for world generation and pathing.
 *
 * Uses axial coordinates (q, r) where:
 * - q is the column (east-west axis)
 * - r is the row (south-west to north-east axis)
 *
 * Based on standard axial hex grid math from redblobgames.com.
 */

export interface HexCoord {
  q: number;
  r: number;
}

/**
 * Get the 6 orthogonal neighbors of a hex tile in axial coordinates.
 *
 * Direction offsets for axial (q, r):
 * - East:  (+1,  0)
 * - West:  (-1,  0)
 * - NE:    ( 0, -1)
 * - SW:    ( 0, +1)
 * - SE:    (+1, -1)
 * - NW:    (-1, +1)
 *
 * @param coord - The hex coordinate
 * @returns Array of 6 neighboring coordinates
 */
export function getHexNeighbors(coord: HexCoord): HexCoord[] {
  const { q, r } = coord;

  return [
    { q: q + 1, r: r }, // East
    { q: q - 1, r: r }, // West
    { q: q, r: r - 1 }, // NE
    { q: q, r: r + 1 }, // SW
    { q: q + 1, r: r - 1 }, // SE
    { q: q - 1, r: r + 1 }, // NW
  ];
}

/**
 * Get all hex tiles at a specific ring distance from a center.
 *
 * Ring 0 = just the center tile itself.
 * Ring 1 = 6 tiles adjacent to center.
 * Ring 2 = 12 tiles, and so on (ring n has 6*n tiles for n > 0).
 *
 * @param center - The center hex coordinate
 * @param ring - The ring number (0 = center, 1 = adjacent, etc.)
 * @returns Array of hex coordinates at that ring, in clockwise order starting from East
 */
export function getHexRing(center: HexCoord, ring: number): HexCoord[] {
  if (ring === 0) {
    return [center];
  }

  const result: HexCoord[] = [];

  // Start at East position of the ring
  let current = { q: center.q + ring, r: center.r };

  // Walk around the 6 sides of the hex ring
  // Direction order for walking: NE, NW, W, SW, SE, E
  const directions = [
    { dq: 0, dr: -1 }, // NE
    { dq: -1, dr: 0 }, // NW
    { dq: -1, dr: 1 }, // W
    { dq: 0, dr: 1 }, // SW
    { dq: 1, dr: 0 }, // SE
    { dq: 1, dr: -1 }, // E
  ];

  for (let side = 0; side < 6; side++) {
    for (let step = 0; step < ring; step++) {
      result.push(current);
      current = {
        q: current.q + directions[side].dq,
        r: current.r + directions[side].dr,
      };
    }
  }

  return result;
}

/**
 * Calculate the axial hex distance between two coordinates.
 *
 * Uses cube-distance equivalence: convert axial to cube, then compute
 * the maximum of the absolute differences across the three axes.
 *
 * For axial (q, r), cube coordinates are:
 * - x = q
 * - y = (-q - r) / 2
 * - z = r
 *
 * @param a - First hex coordinate
 * @param b - Second hex coordinate
 * @returns The distance (number of steps) between the two tiles
 */
export function getHexDistance(a: HexCoord, b: HexCoord): number {
  // Convert axial to cube coordinates
  const aX = a.q;
  const aZ = a.r;
  const aY = -aX - aZ;

  const bX = b.q;
  const bZ = b.r;
  const bY = -bX - bZ;

  // Cube distance = max(|dx|, |dy|, |dz|)
  const dx = Math.abs(aX - bX);
  const dy = Math.abs(aY - bY);
  const dz = Math.abs(aZ - bZ);

  return Math.max(dx, dy, dz);
}

/**
 * Get the ring number for a coordinate relative to a center.
 *
 * Ring number is equivalent to the hex distance from the center.
 *
 * @param coord - The hex coordinate
 * @param center - The center hex coordinate (default: origin {q: 0, r: 0})
 * @returns The ring number (0 = center, 1 = adjacent, etc.)
 */
export function getRingIndex(coord: HexCoord, center: HexCoord = { q: 0, r: 0 }): number {
  return getHexDistance(coord, center);
}

/**
 * Create a hex coordinate from q and r values.
 *
 * @param q - The column (east-west axis)
 * @param r - The row (south-west to north-east axis)
 * @returns A HexCoord object
 */
export function makeHex(q: number, r: number): HexCoord {
  return { q, r };
}

/**
 * Generate a unique string ID for a hex coordinate.
 *
 * Format: "q,r" (e.g., "0,0", "1,-2", "-3,5")
 *
 * @param coord - The hex coordinate
 * @returns A string ID suitable for use as a map key or WorldCellId
 */
export function hexCoordToId(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

/**
 * Parse a hex coordinate from a string ID.
 *
 * @param id - The string ID in format "q,r"
 * @returns The parsed HexCoord, or null if invalid
 */
export function idToHexCoord(id: string): HexCoord | null {
  const parts = id.split(',');
  if (parts.length !== 2) {
    return null;
  }

  const q = parseInt(parts[0], 10);
  const r = parseInt(parts[1], 10);

  if (isNaN(q) || isNaN(r)) {
    return null;
  }

  return { q, r };
}
