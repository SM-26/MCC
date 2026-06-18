<!-- src/components/world/WorldGrid.svelte -->
<script lang="ts">
  import type { WorldCell, WorldCellId } from '../../logic/world/worldTypes';
  import { gameState } from '../../logic/app/gameState.svelte';
  import { log } from '../../lib/logger';

  type Props = {
    cells: WorldCell[];
    selectedCellId?: WorldCellId | null;
    onSelectCell?: (cell: WorldCell) => void;
    onSelectPlot?: (cell: WorldCell) => void;
    onClearSelection?: () => void;
    onOpenMine?: (cell: WorldCell) => void;
  };

  const { cells, selectedCellId = null, onSelectCell, onSelectPlot, onClearSelection, onOpenMine }: Props = $props();

  $effect(() => {
    // console.log('WorldGrid props', cells.length, selectedCellId);
    log.debug('WorldGrid', 'Props updated:', { cells, selectedCellId });
  });

  const HEX_SIZE = 30;
  const HEX_W = 80;
  const HEX_H = 80;
  const SCALE_X = HEX_W / (Math.sqrt(3) * HEX_SIZE);
  const SCALE_Y = HEX_H / (2 * HEX_SIZE);
  const SPACING_X = 1;
  const SPACING_Y = 1.15;

  function axialToPixel(cell: WorldCell) {
    return {
      x: HEX_SIZE * (Math.sqrt(3) * cell.q + (Math.sqrt(3) / 2) * cell.r) * SCALE_X * SPACING_X,
      y: HEX_SIZE * (1.5 * cell.r) * SCALE_Y * SPACING_Y,
    };
  }

  function handleLayerClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('button.hex')) onClearSelection?.();
  }

  function handleClick(cell: WorldCell, event: MouseEvent) {
    event.stopPropagation();

    if (cell.type === 'plot') {
      onSelectPlot?.(cell);
      return;
    }

    onSelectCell?.(cell);
  }

  function handleDoubleClick(cell: WorldCell, event: MouseEvent) {
    event.stopPropagation();

    if (cell.type === 'plot' && selectedCellId === cell.id) {
      onOpenMine?.(cell);
    }
  }
</script>

<div class="world-grid">
  <div
    class="world-layer"
    role="button"
    tabindex="0"
    onclick={handleLayerClick}
    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), onClearSelection?.()) : undefined)}
  >
    {#each cells as cell (cell.id)}
      {@const pos = axialToPixel(cell)}
      <button
        class:selected={selectedCellId === cell.id}
        class={`hex type-${cell.type} ${cell.discovered ? 'discovered' : 'hidden'}`}
        style={`--x:${pos.x}px; --y:${pos.y}px; --w:${HEX_W}px; --h:${HEX_H}px;`}
        onclick={(e) => handleClick(cell, e)}
        ondblclick={(e) => handleDoubleClick(cell, e)}
        title={cell.name}
        aria-label={cell.name}
        type="button"
      >
        <span class="hex-shape"></span>
        <span class="hex-content">
          {#if gameState.current.settings.devMode || cell.discovered}
            <span class="label">{cell.name}</span>
          {/if}

          {#if gameState.current.settings.devMode}
            <span class="coords">{cell.q}, {cell.r}</span>
          {/if}
        </span>
      </button>
    {/each}
  </div>
</div>

<style>
  .world-grid {
    position: relative;
    width: 100%;
    height: 360px;
    overflow: hidden;
    border: 1px solid var(--mcc-border);
    border-radius: 14px;
    background: var(--mcc-bg-surface);
  }

  .world-layer {
    position: absolute;
    inset: 0;
  }

  .hex {
    position: absolute;
    width: var(--w);
    height: var(--h);
    left: calc(50% + var(--x));
    top: calc(50% + var(--y));
    transform: translate(-50%, -50%);
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--mcc-text-main);
    cursor: pointer;
    box-sizing: border-box;
  }

  .hex-shape {
    position: absolute;
    inset: 0;
    border: 1px solid var(--mcc-border);
    background: color-mix(in srgb, var(--mcc-bg-surface) 84%, black 16%);
    clip-path: polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0% 50%);
    transform: rotate(30deg);
    transform-origin: center;
  }

  .hex-content {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 2px;
    pointer-events: none;
    z-index: 1;
  }

  .hex.hidden {
    opacity: 0.45;
  }

  .hex.selected {
    z-index: 2;
  }

  .type-plot .hex-shape {
    background: color-mix(in srgb, #3b82f6 22%, var(--mcc-bg-surface));
  }

  .type-city .hex-shape {
    background: color-mix(in srgb, #10b981 22%, var(--mcc-bg-surface));
  }

  .type-factory .hex-shape {
    background: color-mix(in srgb, #f59e0b 22%, var(--mcc-bg-surface));
  }

  .type-empty .hex-shape {
    background: color-mix(in srgb, #94a3b8 14%, var(--mcc-bg-surface));
  }

  .type-blocker .hex-shape {
    background: color-mix(in srgb, #ef4444 22%, var(--mcc-bg-surface));
  }

  .label,
  .coords {
    pointer-events: none;
    font-size: 0.7rem;
    line-height: 1;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.35);
  }
</style>
