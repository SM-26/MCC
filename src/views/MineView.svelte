<!-- /src/views/MineView.svelte -->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Button } from 'bits-ui';

  import { debouncedSave } from '../logic/save/save.svelte';
  import { getClearProgress, getClearStatus } from '../logic/mine/mineGen';
  import { runMiningTick } from '../logic/mine/mineTick';
  import {
    buyMiner,
    canBuyMiner,
    digDeeper,
    getMinerCost,
    handleBuyStationAction,
    handleNextShaftAction,
    handlePreviousShaftAction,
    moveOrMergeMiner,
  } from '../logic/mine/mineActions';
  import { triggerMobileToast } from '../components/GameTooltip.svelte';
  import MineHeader from '../components/mine/MineHeader.svelte';
  import MineGrid from '../components/mine/MineGrid.svelte';
  import { log } from '../lib/logger';

  import { appContext } from '../logic/app/appContext.svelte';
  import { engineeringStore } from '../logic/engineering/engineeringStore.svelte';
  import { gameState } from '../logic/app/gameState.svelte';
  import { mineStore } from '../logic/mine/mineStore.svelte';
  import { worldStore } from '../logic/world/worldStore.svelte';

  import type { ScreenSize } from '../lib/sizes';
  import type { Miner, Mineshaft } from '../logic/mine/mineTypes';

  const screenSize = $derived<ScreenSize>(appContext.current.screenSize);
  const activePlotCellId = $derived(worldStore.current.activePlotCellId);
  const activeWorldCell = $derived(worldStore.activePlotCell);
  const activePlotState = $derived(mineStore.current);
  const activeMineshaft = $derived(activePlotState.mineshafts[activePlotState.activeMineshaftIndex] ?? null);
  const activeMine = $derived(activeMineshaft?.mineDepths[activeMineshaft.activeDepthIndex] ?? null);
  const currentShaftLabel = $derived(activeWorldCell?.name ?? 'Mine');
  const nextShaftLabel = $derived(`Shaft ${activePlotState.activeMineshaftIndex + 2}`);
  const minerCost = $derived(getMinerCost(activeMine));
  const playerCanBuyMiner = $derived(canBuyMiner(gameState.current.money, activeMine));
  const clearPercent = $derived(activeMine ? getClearProgress(activeMine) : 0);
  const clearStatus = $derived(activeMine ? getClearStatus(activeMine) : 'none');
  const canGoPrevious = $derived(activePlotState.activeMineshaftIndex > 0);
  const canGoNext = $derived(false);
  const canDigDeeper = $derived(clearStatus === 'hard');
  const canBuyNextShaft = $derived(
    activeMine
      ? activeMine.depth === 0 && clearStatus === 'soft' && gameState.current.money >= 100 && activePlotState.activeMineshaftIndex < engineeringStore.current.maxNorthExpansions
      : false,
  );
  const canBuyStation = $derived(false);

  let interval: ReturnType<typeof setInterval>;
  let draggedMiner = $state<Miner | null>(null);
  let draggedPointerId = $state<number | null>(null);
  let dragPos = $state({ x: 0, y: 0 });
  let isDraggingMiner = $state(false);

  function handleMiningTick() {
    if (!activeMine) return;
    const result = runMiningTick(activeMine, gameState.current.money);
    gameState.current.money = result.nextMoney;
    if (result.didClearTile || result.didEarnMoney) debouncedSave();
  }

  function resetDragState() {
    isDraggingMiner = false;
    draggedMiner = null;
    draggedPointerId = null;
    if (activeMineshaft) activeMineshaft.draggedMiner = null;
  }

  function handleMinerPointerDown(event: PointerEvent, miner: Miner) {
    if (!activeMine || !activeMineshaft) return;
    event.preventDefault();
    draggedMiner = miner;
    draggedPointerId = event.pointerId;
    isDraggingMiner = true;
    dragPos = { x: event.clientX, y: event.clientY };
    activeMineshaft.selectedMiner = miner;
    activeMineshaft.draggedMiner = miner;
    const element = event.currentTarget as HTMLElement | null;
    element?.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent) {
    if (!isDraggingMiner || draggedPointerId !== event.pointerId) return;
    event.preventDefault();
    dragPos = { x: event.clientX, y: event.clientY };
  }

  function getDropTileIndex(clientX: number, clientY: number): number | null {
    const dropTarget = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const tileElement = dropTarget?.closest?.('[data-tile-index]') as HTMLElement | null;
    if (!tileElement) return null;
    const rawIndex = tileElement.dataset.tileIndex;
    const targetIdx = rawIndex ? Number(rawIndex) : Number.NaN;
    return Number.isNaN(targetIdx) ? null : targetIdx;
  }

  function handleDropResult(result: ReturnType<typeof moveOrMergeMiner>, draggedMiner: Miner, activeMineshaft: Mineshaft) {
    if (!result.ok) {
      if (result.reason === 'blocked-target') log.info('finishPointerDrag-> move miner', result.message);
      else triggerMobileToast(result.message);
      return;
    }

    if (result.action === 'merge') {
      activeMineshaft.selectedMiner = result.mergedMiner;
      triggerMobileToast(result.message);
    } else {
      activeMineshaft.selectedMiner = draggedMiner;
    }

    debouncedSave();
  }

  function finishPointerDrag(clientX: number, clientY: number) {
    if (!activeMine || !draggedMiner || !activeMineshaft) {
      resetDragState();
      return;
    }

    const targetIdx = getDropTileIndex(clientX, clientY);
    if (targetIdx === null) {
      resetDragState();
      return;
    }

    const result = moveOrMergeMiner(activeMine, draggedMiner, targetIdx);
    handleDropResult(result, draggedMiner, activeMineshaft);
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
    const result = buyMiner(gameState.current.money, activeMine);
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    gameState.current.money = result.nextMoney ?? gameState.current.money - result.minerCost;
    debouncedSave();
  }

  function handleDigDeeperAction() {
    const result = digDeeper(gameState.current.settings.worldSeed, 0, activePlotState.activeMineshaftIndex, activeMineshaft);
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    resetDragState();
    debouncedSave();
  }

  function handlePreviousShaft() {
    const result = handlePreviousShaftAction(activePlotState.activeMineshaftIndex);
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    debouncedSave();
  }

  function handleNextShaft() {
    const result = handleNextShaftAction({
      worldSeed: gameState.current.settings.worldSeed,
      resetCount: 0,
      money: gameState.current.money,
      maxShafts: engineeringStore.current.maxNorthExpansions,
      activeShaftIndex: activePlotState.activeMineshaftIndex,
      shaftsLength: 1,
      activeMineshaft,
      activeMine,
    });

    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }

    if (typeof result.nextMoney === 'number') {
      gameState.current.money = result.nextMoney;
    }

    resetDragState();
    debouncedSave();
  }

  function handleBuyNextShaft() {
    const result = handleNextShaftAction({
      worldSeed: gameState.current.settings.worldSeed,
      resetCount: 0,
      money: gameState.current.money,
      maxShafts: engineeringStore.current.maxNorthExpansions,
      activeShaftIndex: activePlotState.activeMineshaftIndex,
      shaftsLength: 1,
      activeMineshaft,
      activeMine,
    });

    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }

    if (typeof result.nextMoney === 'number') {
      gameState.current.money = result.nextMoney;
    }

    resetDragState();
    debouncedSave();
  }

  function handleBuyStation() {
    const result = handleBuyStationAction({ stationUnlocked: false, money: gameState.current.money, stationCost: 0 });
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    debouncedSave();
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
    interval = setInterval(handleMiningTick, 1000);
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

{#if activePlotState && activeMineshaft && activeMine}
  <div class="mine-view size-{screenSize}">
    <MineHeader
      shaftLabel={currentShaftLabel}
      {nextShaftLabel}
      depth={activeMine.depth}
      {clearStatus}
      {clearPercent}
      {canGoPrevious}
      {canGoNext}
      {canBuyNextShaft}
      {canDigDeeper}
      {canBuyStation}
      onPreviousShaft={handlePreviousShaft}
      onNextShaft={handleNextShaft}
      onBuyNextShaft={handleBuyNextShaft}
      onBuyStation={handleBuyStation}
      onDigDeeper={handleDigDeeperAction}
    />

    <MineGrid {activeMine} {draggedMiner} {dragPos} {isDraggingMiner} onMinerPointerDown={handleMinerPointerDown} />

    <div class="mine-actions">
      <Button.Root class="buy-btn" onclick={handleBuyMiner} disabled={!playerCanBuyMiner}>
        Buy Miner (${minerCost})
      </Button.Root>
    </div>
  </div>
{/if}

<style>
  .mine-view {
    --tile-size: clamp(56px, 10dvh, 120px);
    --mine-gap: var(--spacing-md);
    --mine-padding: var(--spacing-md);
    --mine-header-padding: 12px;
    --mine-nav-columns: 4;
    --mine-miner-size: 1.45rem;
    --mine-miner-label-size: 0.7rem;

    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }

  .mine-view.size-xs {
    --tile-size: 60px;
    --mine-gap: var(--spacing-sm);
    --mine-padding: var(--spacing-sm);
    --mine-header-padding: 8px;
    --mine-nav-columns: 2;
    --mine-miner-size: 1.05rem;
    --mine-miner-label-size: 0.55rem;
  }

  .mine-view.size-sm {
    --tile-size: 80px;
    --mine-gap: 10px;
    --mine-padding: 8px;
    --mine-header-padding: 10px;
    --mine-nav-columns: 2;
    --mine-miner-size: 1.15rem;
    --mine-miner-label-size: 0.6rem;
  }

  .mine-view.size-md {
    --tile-size: 88px;
    --mine-nav-columns: 4;
    --mine-miner-size: 1.35rem;
    --mine-miner-label-size: 0.68rem;
  }

  .mine-view.size-lg {
    --tile-size: 92px;
    --mine-nav-columns: 4;
    --mine-miner-size: 1.5rem;
    --mine-miner-label-size: 0.72rem;
  }

  .mine-view.size-xl {
    --tile-size: 95px;
    --mine-gap: 20px;
    --mine-padding: 20px;
    --mine-header-padding: 14px;
    --mine-nav-columns: 4;
    --mine-miner-size: 1.6rem;
    --mine-miner-label-size: 0.76rem;
  }

  .mine-grid-shell {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    display: flex;
    overflow: hidden;
  }

  .mine-actions {
    flex: 0 0 auto;
    margin-top: auto;
    padding: var(--mine-gap) var(--mine-padding) var(--mine-padding);
  }

  :global(.buy-btn) {
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

  :global(.buy-btn:hover:not(:disabled)) {
    background: var(--mcc-buy-btn-hover, #16a34a);
    border-color: color-mix(in srgb, var(--mcc-buy-btn-border, #166534) 70%, white 30%);
    transform: translateY(-1px);
  }

  :global(.buy-btn:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
</style>
