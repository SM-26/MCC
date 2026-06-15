<!-- src/views/WorldGrid.svelte -->
<script lang="ts">
  import type { WorldCell, WorldCellId } from '../../logic/world/worldTypes';

  type Props = {
    cells: WorldCell[];
    selectedCellId?: WorldCellId | null;
    onSelectCell?: (cell: WorldCell) => void;
    onSelectPlot?: (cell: WorldCell) => void;
  };

  let { cells, selectedCellId = null, onSelectCell, onSelectPlot }: Props = $props();

  const HEX_W = 72;
  const HEX_H = 82;
  const X_STEP = 54;
  const Y_STEP = 41;

  function cellToXY(cell: WorldCell) {
    const x = cell.q * X_STEP;
    const y = cell.r * Y_STEP + (cell.q % 2 ? HEX_H / 2 : 0);
    return { x, y };
  }

  function handleClick(cell: WorldCell) {
    if (cell.type === 'plot' && onSelectPlot) {
      onSelectPlot(cell);
      return;
    }

    onSelectCell?.(cell);
  }
</script>

<div class="world-grid">
  {#each cells as cell (cell.id)}
    {@const pos = cellToXY(cell)}
    <button
      class:selected={selectedCellId === cell.id}
      class={`hex type-${cell.type} ${cell.discovered ? 'discovered' : 'hidden'}`}
      style={`--x:${pos.x}px; --y:${pos.y}px;`}
      onclick={() => handleClick(cell)}
      title={cell.name}
      aria-label={cell.name}
      type="button"
    >
      <span class="label">{cell.name}</span>
      <span class="coords">{cell.q}, {cell.r}</span>
    </button>
  {/each}
</div>

<style>
  .world-grid {
    position: relative;
    width: 100%;
    min-height: 300px;
    overflow: auto;
    border: 1px solid var(--mcc-border);
    border-radius: 14px;
    background: var(--mcc-bg-surface);
  }

  .hex {
    position: absolute;
    left: var(--x);
    top: var(--y);
    width: 72px;
    height: 82px;
    margin: 0;
    padding: 8px;
    border: 1px solid var(--mcc-border);
    background: color-mix(in srgb, var(--mcc-bg-surface) 84%, black 16%);
    color: var(--mcc-text-main);
    clip-path: polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0% 50%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    transform: translate(-50%, -50%);
  }

  .hex.hidden {
    opacity: 0.45;
  }

  .hex.selected {
    outline: 2px solid var(--mcc-accent, #60a5fa);
    z-index: 2;
  }

  .type-plot {
    background: color-mix(in srgb, #3b82f6 22%, var(--mcc-bg-surface));
  }

  .type-city {
    background: color-mix(in srgb, #10b981 22%, var(--mcc-bg-surface));
  }

  .type-factory {
    background: color-mix(in srgb, #f59e0b 22%, var(--mcc-bg-surface));
  }

  .type-fog {
    background: color-mix(in srgb, #64748b 22%, var(--mcc-bg-surface));
  }

  .type-empty {
    background: color-mix(in srgb, #94a3b8 14%, var(--mcc-bg-surface));
  }

  .type-blocker {
    background: color-mix(in srgb, #ef4444 22%, var(--mcc-bg-surface));
  }

  .label {
    font-size: 0.8rem;
    font-weight: 600;
    text-align: center;
  }

  .coords {
    font-size: 0.7rem;
    opacity: 0.8;
  }
</style>
