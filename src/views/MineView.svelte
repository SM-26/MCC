<script lang="ts">
  import { appContext, gameState } from '../stores/index.svelte';
  import { getClearProgress, getClearStatus, generatePlot } from '../logic/mineGen';
  import { toastState } from '../components/GameTooltip.svelte';
  import { Button } from 'bits-ui';
  import MyMeter from '../components/MyMeter.svelte';
  import { onMount, onDestroy } from 'svelte';
  import rubbleSvg from '../assets/rubble-pile.svg?raw';
  import pillarSvg from '../assets/support-pillar.svg?raw';
  import type { Miner, MineTile, ScreenSizes } from '../types';

  const BASE_MINER_COST = 50;

  const screenSize = $derived<ScreenSizes>(appContext.screenSize);
  const activePlot = $derived(gameState.mines?.plots?.[gameState.mines.activePlot] ?? null);
  const minerCost = $derived(Math.floor(BASE_MINER_COST * Math.pow(1.5, activePlot?.miners.length ?? 0)));
  const canBuyMiner = $derived(gameState.money >= minerCost);
  const clearPercent = $derived(activePlot ? getClearProgress(activePlot) : 0);
  const clearStatus = $derived(activePlot ? getClearStatus(activePlot) : 'none');

  let interval: ReturnType<typeof setInterval>;

  let draggedMiner = $state<Miner | null>(null);
  let draggedPointerId = $state<number | null>(null);
  let dragPos = $state({ x: 0, y: 0 });
  let isDraggingMiner = $state(false);

  function runMiningTick() {
    if (!activePlot) return;

    activePlot.miners.forEach((miner) => {
      const row = Math.floor(miner.tileIndex / activePlot.cols);
      const col = miner.tileIndex % activePlot.cols;

      const directions: Array<readonly [number, number]> = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];

      const targets: { r: number; c: number; tile: MineTile }[] = [];

      for (const [dr, dc] of directions) {
        const nextRow = row + dr;
        const nextCol = col + dc;

        if (nextRow >= 0 && nextRow < activePlot.rows && nextCol >= 0 && nextCol < activePlot.cols) {
          const tile = activePlot.tiles[nextRow][nextCol];

          if (tile.hp > 0 && tile.type !== 'blocker' && tile.type !== 'empty') {
            targets.push({ r: nextRow, c: nextCol, tile });
          }
        }
      }

      targets.sort((a, b) => b.tile.value - a.tile.value);

      if (targets.length === 0) return;

      const target = targets[0];
      target.tile.hp -= miner.level;

      if (target.tile.hp <= 0) {
        target.tile.hp = 0;

        if (target.tile.value > 0) {
          gameState.money += target.tile.value;
        }

        target.tile.type = 'empty';
        target.tile.resourceType = 'none';
      }
    });
  }

  function resetDragState() {
    isDraggingMiner = false;
    draggedMiner = null;
    draggedPointerId = null;
    gameState.mines.draggedMiner = null;
  }

  function handlePointerDown(event: PointerEvent, miner: Miner) {
    if (!activePlot) return;

    event.preventDefault();

    draggedMiner = miner;
    draggedPointerId = event.pointerId;
    isDraggingMiner = true;
    dragPos = { x: event.clientX, y: event.clientY };

    gameState.mines.selectedMiner = miner;
    gameState.mines.draggedMiner = miner;

    const element = event.currentTarget as HTMLElement | null;
    element?.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent) {
    if (!isDraggingMiner || draggedPointerId !== event.pointerId) return;

    event.preventDefault();
    dragPos = { x: event.clientX, y: event.clientY };
  }

  function finishPointerDrag(clientX: number, clientY: number) {
    if (!activePlot || !draggedMiner) {
      resetDragState();
      return;
    }

    const dropTarget = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const tileElement = dropTarget?.closest?.('[data-tile-index]') as HTMLElement | null;

    if (tileElement) {
      const rawIndex = tileElement.dataset.tileIndex;
      const targetIdx = rawIndex ? Number(rawIndex) : Number.NaN;

      if (!Number.isNaN(targetIdx)) {
        const row = Math.floor(targetIdx / activePlot.cols);
        const col = targetIdx % activePlot.cols;
        const targetTile = activePlot.tiles[row]?.[col];
        const occupiedByMiner = activePlot.miners.some((miner) => miner !== draggedMiner && miner.tileIndex === targetIdx);

        if (targetTile?.type === 'empty' && !occupiedByMiner) {
          draggedMiner.tileIndex = targetIdx;
        } else {
          toastState.activeText = occupiedByMiner ? 'Another miner is already there' : 'Target tile must be empty';
        }
      }
    }

    resetDragState();
  }

  function handlePointerUp(event: PointerEvent) {
    if (draggedPointerId !== event.pointerId) return;

    event.preventDefault();
    finishPointerDrag(event.clientX, event.clientY);
  }

  function handlePointerCancel(event: PointerEvent) {
    if (draggedPointerId !== event.pointerId) return;

    resetDragState();
  }

  function handleBuyMiner() {
    if (!activePlot) return;

    if (!canBuyMiner) {
      toastState.activeText = 'Not enough money!';
      return;
    }

    const emptyIndices = activePlot.tiles
      .flat()
      .map((tile, index) => (tile.type === 'empty' ? index : -1))
      .filter((index) => index !== -1);

    const occupiedIndices = new Set(activePlot.miners.map((miner) => miner.tileIndex));
    const freeIndices = emptyIndices.filter((index) => !occupiedIndices.has(index));

    if (freeIndices.length === 0) {
      toastState.activeText = 'No room!';
      return;
    }

    gameState.money -= minerCost;
    activePlot.miners.push({
      level: 1,
      tileIndex: freeIndices[0],
      facing: 0,
      progress: 0,
    });
  }

  function handleDigDeeper() {
    if (!activePlot) return;

    if (clearStatus !== 'hard') {
      toastState.activeText = 'Clear all rubble and dirt first!';
      return;
    }

    activePlot.tiles = generatePlot(gameState.settings.worldSeed, activePlot.depth + 1, 0).tiles;
    activePlot.depth++;

    const validMinerTiles = new Set(
      activePlot.tiles
        .flat()
        .map((tile, index) => (tile.type === 'empty' ? index : -1))
        .filter((index) => index !== -1),
    );

    activePlot.miners = activePlot.miners.map((miner, minerIndex) => ({
      ...miner,
      tileIndex: validMinerTiles.has(miner.tileIndex) ? miner.tileIndex : ([...validMinerTiles][minerIndex] ?? 0),
    }));

    resetDragState();
  }

  function changePlot(delta: number) {
    const next = gameState.mines.activePlot + delta;

    if (next >= 0 && next < gameState.mines.plots.length) {
      gameState.mines.activePlot = next;
      gameState.mines.selectedMiner = null;
      resetDragState();
    }
  }

  function handleGlobalPointerMove(event: PointerEvent) {
    handlePointerMove(event);
  }

  function handleGlobalPointerUp(event: PointerEvent) {
    handlePointerUp(event);
  }

  function handleGlobalPointerCancel(event: PointerEvent) {
    handlePointerCancel(event);
  }

  onMount(() => {
    interval = setInterval(runMiningTick, 1000);

    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: false });
    window.addEventListener('pointerup', handleGlobalPointerUp, { passive: false });
    window.addEventListener('pointercancel', handleGlobalPointerCancel, { passive: false });
  });

  onDestroy(() => {
    clearInterval(interval);

    window.removeEventListener('pointermove', handleGlobalPointerMove);
    window.removeEventListener('pointerup', handleGlobalPointerUp);
    window.removeEventListener('pointercancel', handleGlobalPointerCancel);
  });
</script>

{#if activePlot}
  <div class="mine-view size-{screenSize}">
    <header class="header">
      <div class="stats">
        <span>Plot: {gameState.mines.activePlot} | Depth: {activePlot.depth}</span>
        <span>Status: {clearStatus.toUpperCase()}</span>
      </div>

      <MyMeter value={clearPercent} max={100} status={clearStatus} />

      <div class="nav-grid">
        <button onclick={() => changePlot(-1)} disabled={gameState.mines.activePlot === 0}>← North</button>
        <button onclick={() => changePlot(1)} disabled={gameState.mines.activePlot >= gameState.mines.plots.length - 1}>South →</button>
        <button disabled>Up</button>
        <button onclick={handleDigDeeper} disabled={clearStatus !== 'hard'}>Down / Dig</button>
      </div>
    </header>

    <div class="mine-board">
      <div
        class="tile-grid"
        style="grid-template-columns: repeat({activePlot.cols}, 1fr); grid-template-rows: repeat({activePlot.tiles.length}, 1fr);"
        role="grid"
        aria-label="Mine grid"
      >
        {#each activePlot.tiles as row, r}
          {#each row as tile, c}
            {@const tileIndex = r * activePlot.cols + c}
            {@const miner = activePlot.miners.find((m) => m.tileIndex === tileIndex)}
            {@const occupiedByOtherMiner = activePlot.miners.some((m) => m !== miner && m.tileIndex === tileIndex)}

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
                  {@html rubbleSvg}
                </div>
              {/if}

              {#if tile.type === 'blocker'}
                <div class="icon" aria-hidden="true">
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
                  onpointerdown={(event) => handlePointerDown(event, miner)}
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

    <div class="mine-actions">
      <button class="buy-btn" onclick={handleBuyMiner} disabled={!canBuyMiner}>
        Buy Miner (${minerCost})
      </button>
    </div>

    {#if isDraggingMiner && draggedMiner}
      <div class="drag-ghost" style="left: {dragPos.x}px; top: {dragPos.y}px;" aria-hidden="true">
        <span class="miner-lvl">Lvl {draggedMiner.level}</span>
        <span aria-hidden="true">⛏️</span>
      </div>
    {/if}
  </div>
{/if}

<style>
  .mine-board {
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    overflow: auto;
    padding: 0 var(--mine-padding);
  }

  .mine-view {
    --tile-size: 60px;
    --mine-gap: var(--spacing-md);
    --mine-padding: var(--spacing-md);
    --mine-header-padding: 12px;
    --mine-nav-columns: 4;
    --mine-miner-size: 1.45rem;
    --mine-miner-label-size: 0.7rem;

    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 300px;
    min-width: 0;
    overflow: hidden;
    background: var(--mcc-bg-primary);
    color: var(--mcc-text-main);
    gap: var(--mine-gap);
  }

  .mine-view.size-xs {
    --tile-size: 46px;
    --mine-gap: var(--spacing-sm);
    --mine-padding: var(--spacing-sm);
    --mine-header-padding: 8px;
    --mine-nav-columns: 2;
    --mine-miner-size: 1.05rem;
    --mine-miner-label-size: 0.55rem;
  }

  .mine-view.size-sm {
    --tile-size: 52px;
    --mine-gap: 12px;
    --mine-padding: 12px;
    --mine-header-padding: 10px;
    --mine-nav-columns: 2;
    --mine-miner-size: 1.15rem;
    --mine-miner-label-size: 0.6rem;
  }

  .mine-view.size-md {
    --tile-size: 60px;
    --mine-nav-columns: 4;
    --mine-miner-size: 1.35rem;
    --mine-miner-label-size: 0.68rem;
  }

  .mine-view.size-lg {
    --tile-size: 68px;
    --mine-nav-columns: 4;
    --mine-miner-size: 1.5rem;
    --mine-miner-label-size: 0.72rem;
  }

  .mine-view.size-xl {
    --tile-size: 76px;
    --mine-gap: 20px;
    --mine-padding: 20px;
    --mine-header-padding: 14px;
    --mine-nav-columns: 4;
    --mine-miner-size: 1.6rem;
    --mine-miner-label-size: 0.76rem;
  }

  .header {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    padding: 0 var(--mine-padding);
  }

  .stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
    font-family: monospace;
    font-size: 0.875rem;
    color: var(--mcc-text-main);
  }

  .nav-grid {
    display: grid;
    grid-template-columns: repeat(var(--mine-nav-columns), minmax(0, 1fr));
    gap: var(--spacing-sm);
  }

  .nav-grid button {
    min-height: 40px;
    padding: 8px 10px;
    border: 1px solid var(--mcc-border);
    border-radius: 8px;
    background: color-mix(in srgb, var(--mcc-bg-surface) 70%, white 8%);
    color: var(--mcc-text-main);
    cursor: pointer;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      transform 0.15s ease,
      opacity 0.15s ease;
  }

  .nav-grid button:hover:not(:disabled) {
    background: color-mix(in srgb, var(--mcc-bg-surface) 78%, white 14%);
    border-color: var(--mcc-accent);
    transform: translateY(-1px);
  }

  .nav-grid button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }

  .tile-grid {
    display: grid;
    gap: var(--spacing-xs);
    width: fit-content;
    max-width: 100%;
    margin: 0 auto;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }

  .tile {
    width: var(--tile-size);
    aspect-ratio: 1 / 1;
    border-radius: 8px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background 0.2s ease,
      transform 0.15s ease,
      outline-color 0.15s ease,
      box-shadow 0.15s ease,
      border-color 0.15s ease;
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

  .tile.dirt:hover,
  .tile.rubble:hover {
    transform: translateY(-2px);
    filter: brightness(1.05);
  }

  .icon {
    width: 80%;
    height: 80%;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
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
    bottom: 4px;
    left: 4px;
    right: 4px;
    height: 4px;
    background: var(--mcc-hp-bg, #000000);
    border-radius: 999px;
    overflow: hidden;
  }

  .hp-fill {
    height: 100%;
    background: var(--mcc-hp-fill, #ef4444);
    transition: width 0.3s ease;
  }

  .mine-actions {
    flex: 0 0 auto;
    padding: 0 var(--mine-padding) var(--mine-padding);
  }

  .buy-btn {
    width: 100%;
    min-height: 46px;
    padding: 12px 14px;
    border: 1px solid var(--mcc-buy-btn-border, #166534);
    border-radius: 10px;
    background: var(--mcc-buy-btn, #15803d);
    color: var(--mcc-text-main);
    font-weight: 700;
    cursor: pointer;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      transform 0.15s ease,
      opacity 0.15s ease;
  }

  .buy-btn:hover:not(:disabled) {
    background: var(--mcc-buy-btn-hover, #16a34a);
    border-color: color-mix(in srgb, var(--mcc-buy-btn-border, #166534) 70%, white 30%);
    transform: translateY(-1px);
  }

  .buy-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .drag-ghost {
    position: fixed;
    left: 0;
    top: 0;
    transform: translate(-50%, -50%);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: var(--mine-miner-size);
    line-height: 1;
    pointer-events: none;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.45));
  }
</style>
