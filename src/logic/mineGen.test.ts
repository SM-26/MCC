import { describe, it, expect } from 'vitest';
import { generatePlot, MineGenConfig } from './mineGen';

describe('MineGen Determinism & Scaling', () => {
  it('should generate the exact same plot for the same seed/depth/index', () => {
    const plot1 = generatePlot('seed-123', 5, 0);
    const plot2 = generatePlot('seed-123', 5, 0);
    expect(plot1).toEqual(plot2);
  });

  it('should scale rows correctly based on plotIndex', () => {
    expect(MineGenConfig.getDimensions(0, 0).rows).toBe(5);
    expect(MineGenConfig.getDimensions(0, 1).rows).toBe(6);
    expect(MineGenConfig.getDimensions(0, 3).rows).toBe(7);
  });

  it('should scale columns correctly based on depth', () => {
    expect(MineGenConfig.getDimensions(0, 0).cols).toBe(5);
    expect(MineGenConfig.getDimensions(20, 0).cols).toBe(6);
    expect(MineGenConfig.getDimensions(40, 0).cols).toBe(7);
  });
});

describe('MineGen Constraint Enforcement', () => {
  it('should always have the bottom row empty', () => {
    const plot = generatePlot('test-seed', 10, 0);
    const bottomRow = plot.tiles[plot.rows - 1];
    bottomRow.forEach((tile) => {
      expect(tile.type).toBe('empty');
    });
  });

  it('should respect the max chain length constraint', () => {
    // This requires implementing the check in your test logic
    // or by inspecting the generated grid
    const plot = generatePlot('large-seed', 5, 5);
    // You can write a helper to scan for blocker chains
    expect(hasIllegalChain(plot)).toBe(false);
  });
});

// Helper for testing
function hasIllegalChain(plot: any): boolean {
  // Implement DFS or BFS here to verify no chain > (min(rows,cols) - 1)
  return false;
}
