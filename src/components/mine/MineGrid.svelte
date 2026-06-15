<script lang="ts">
  import rubbleSvg from '../../assets/rubble-pile.svg?raw';
  import pillarSvg from '../../assets/support-pillar.svg?raw';
  // import type { MineDepth, Miner } from '../../types';
  import type { MineDepthState as MineDepth, Miner } from '../../logic/mine/mineTypes';

  const {
    activeMine,
    draggedMiner = null,
    dragPos,
    isDraggingMiner = false,
    onMinerPointerDown,
  }: {
    activeMine: MineDepth;
    draggedMiner?: Miner | null;
    dragPos: { x: number; y: number };
    isDraggingMiner?: boolean;
    onMinerPointerDown: (event: PointerEvent, miner: Miner) => void;
  } = $props();
</script>

<div class="mine-board">
  <div
    class="tile-grid"
    style="
      --grid-cols: {activeMine.cols};
      --grid-rows: {activeMine.tiles.length};
      grid-template-columns: repeat({activeMine.cols}, 1fr);
      grid-template-rows: repeat({activeMine.tiles.length}, 1fr);
    "
    role="grid"
    aria-label="Mine grid"
  >
    {#each activeMine.tiles as row, r (`row-${r}`)}
      {#each row as tile, c (`tile-${r}-${c}`)}
        {@const tileIndex = r * activeMine.cols + c}
        {@const miner = activeMine.miners.find((m) => m.tileIndex === tileIndex)}
        {@const occupiedByOtherMiner = activeMine.miners.some((m) => m !== miner && m.tileIndex === tileIndex)}

        <div
          class="tile {tile.type}"
          class:drop-target={isDraggingMiner && tile.type === 'empty' && !occupiedByOtherMiner}
          data-tile-index={tileIndex}
          role="gridcell"
          tabindex="0"
          aria-label={`Tile ${r + 1}, ${c + 1}, ${tile.type}`}
        >
          {#if tile.type === 'rubble'}
            <div class="icon" aria-hidden="true">
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html rubbleSvg}
            </div>
          {/if}

          {#if tile.type === 'blocker'}
            <div class="icon" aria-hidden="true">
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html pillarSvg}
            </div>
          {/if}

          {#if tile.hp < tile.maxHp && tile.hp > 0}
            <div class="hp-bar" aria-hidden="true">
              <div class="hp-fill" style="width: {(tile.hp / tile.maxHp) * 100}%"></div>
            </div>
          {/if}

          {#if miner}
            <div
              class="miner"
              class:drag-source={draggedMiner === miner}
              onpointerdown={(event) => onMinerPointerDown(event, miner)}
              role="button"
              tabindex="0"
              aria-label={`Move level ${miner.level} miner`}
            >
              <span class="miner-lvl">Lvl {miner.level}</span>
              <span aria-hidden="true">⛏️</span>
            </div>
          {/if}
        </div>
      {/each}
    {/each}
  </div>
</div>

{#if isDraggingMiner && draggedMiner}
  <div class="drag-ghost" style="left: {dragPos.x}px; top: {dragPos.y}px;" aria-hidden="true">
    <span class="miner-lvl">Lvl {draggedMiner.level}</span>
    <span aria-hidden="true">⛏️</span>
  </div>
{/if}

<style>
  .mine-board {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow: auto;
    padding: 8px var(--mine-padding) 0;
  }

  .mine-board > .tile-grid {
    align-self: center;
  }

  .tile-grid {
    display: grid;
    gap: var(--spacing-xs);
    width: fit-content;
    max-width: 100%;
    margin: 0 auto;
    user-select: none;
    -webkit-user-select: none;
  }

  .tile {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--tile-size);
    aspect-ratio: 1 / 1;
    border-radius: 8px;
  }

  .tile.dirt,
  .tile.rubble {
    background: var(--mcc-tile-dirt, #6b5d4f);
    border: 1px solid var(--mcc-tile-dirt-border, #4a3f35);
  }

  .tile.blocker {
    background: var(--mcc-tile-blocker, #333333);
    border: 1px solid var(--mcc-tile-blocker-border, #1a1a1a);
  }

  .tile.empty {
    background: var(--mcc-tile-empty, #262626);
    border: 1px solid var(--mcc-border);
  }

  .tile.drop-target {
    outline: 2px dashed color-mix(in srgb, var(--mcc-accent) 65%, white 20%);
    outline-offset: -3px;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--mcc-accent) 35%, transparent);
  }

  .icon {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    overflow: hidden;
  }

  .icon :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
    transform: scale(1.18);
    transform-origin: center;
  }

  .miner {
    position: absolute;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: var(--mine-miner-size);
    line-height: 1;
    cursor: grab;
    touch-action: none;
    transition:
      transform 0.15s ease,
      opacity 0.15s ease,
      filter 0.15s ease;
  }

  .miner:active {
    cursor: grabbing;
  }

  .miner.drag-source {
    opacity: 0.22;
    transform: scale(0.92);
    filter: saturate(0.7);
  }

  .miner-lvl {
    font-size: var(--mine-miner-label-size);
    font-weight: 700;
    color: var(--mcc-text-main);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.72);
    pointer-events: none;
  }

  .hp-bar {
    position: absolute;
    left: 4px;
    right: 4px;
    bottom: 4px;
    height: 4px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--mcc-hp-bg, #000000);
  }

  .hp-fill {
    height: 100%;
    background: var(--mcc-hp-fill, #ef4444);
    transition: width 0.3s ease;
  }

  .drag-ghost {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: var(--mine-miner-size);
    line-height: 1;
    pointer-events: none;
    transform: translate(-50%, -50%);
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.45));
  }
</style>
