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
        class={`hex ${cell.discovered || gameState.current.settings.devMode ? `type-${cell.type}` : 'type-hidden'} ${cell.discovered ? 'discovered' : 'hidden'}`}
        style={`--x:${pos.x}px; --y:${pos.y}px; --w:${HEX_W}px; --h:${HEX_H}px;`}
        onclick={(e) => handleClick(cell, e)}
        ondblclick={(e) => handleDoubleClick(cell, e)}
        title={cell.name}
        aria-label={cell.name}
        type="button"
      >
        <span class="hex-ring"></span>
        <span class="hex-shape"></span>
        <span class="hex-content">
          {#if gameState.current.settings.devMode || cell.discovered}
            <span class="label">{cell.name}</span>
          {:else}
            <svg class="fog-icon" viewBox="0 0 24 18" fill="currentColor" aria-hidden="true">
              <rect x="1" y="1" width="22" height="3" rx="1.5" opacity="0.8"/>
              <rect x="3" y="7" width="18" height="3" rx="1.5" opacity="0.6"/>
              <rect x="0" y="13" width="24" height="3" rx="1.5" opacity="0.4"/>
            </svg>
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
    height: 340px;
    overflow: hidden;
    border: 1px solid var(--mcc-border);
    border-radius: 14px;
    background: var(--mcc-ground-2);
    box-shadow:
      inset 0 3px 14px rgba(0, 0, 0, 0.45),
      inset 0 0 0 1px rgba(0, 0, 0, 0.18);
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

  /* Gold selection ring — slightly scaled up, behind hex-shape */
  .hex-ring {
    position: absolute;
    inset: 0;
    background: var(--mcc-gold);
    clip-path: polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0% 50%);
    transform: rotate(30deg) scale(1.14);
    transform-origin: center;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .hex.selected {
    z-index: 2;
  }

  .hex.selected .hex-ring {
    opacity: 1;
  }

  .hex-shape {
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, var(--mcc-bg-surface) 84%, black 16%);
    clip-path: polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0% 50%);
    transform: rotate(30deg);
    transform-origin: center;
    z-index: 1;
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
    z-index: 2;
  }

  .hex.hidden {
    opacity: 0.6;
  }

  /* Cell type colours per design spec */
  .type-hidden .hex-shape {
    background: color-mix(in srgb, var(--mcc-u) 30%, var(--mcc-bg-surface));
  }

  .type-plot .hex-shape {
    background: color-mix(in srgb, var(--mcc-u) 55%, #4a78a8);
  }

  .type-city .hex-shape {
    background: linear-gradient(135deg, #bfa46e, #9a7f49);
  }

  .type-factory .hex-shape {
    background: linear-gradient(135deg, #84799e, #5f5675);
  }

  .type-empty .hex-shape {
    background: color-mix(in srgb, var(--mcc-u) 12%, var(--mcc-bg-surface));
  }

  .type-blocker .hex-shape {
    background: var(--mcc-tile-blocker);
  }

  .label,
  .coords {
    pointer-events: none;
    font-size: 0.65rem;
    line-height: 1;
    font-weight: 700;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  }

  .fog-icon {
    width: 20px;
    height: 14px;
    color: rgba(255, 255, 255, 0.85);
    pointer-events: none;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
  }
</style>
