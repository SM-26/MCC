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
  import MyMeter from '../components/MyMeter.svelte';
  import { RESOURCE_KEYS, RESOURCE_META, type ResourceKey } from '../logic/mine/mineLabels';
  import { getActiveResourcesForDepth } from '../logic/mine/mineGen';
  import { log } from '../lib/logger';

  import { appContext } from '../logic/app/appContext.svelte';
  import { engineeringStore } from '../logic/engineering/engineeringStore.svelte';
  import { gameState } from '../logic/app/gameState.svelte';
  import { plotsStore } from '../logic/mine/plotsStore.svelte';
  import { worldStore } from '../logic/world/worldStore.svelte';
  import { isPlotBuilt } from '../logic/mine/mineTypes';

  import type { ScreenSize } from '../lib/sizes';
  import type { Miner, Mineshaft } from '../logic/mine/mineTypes';

  const screenSize = $derived<ScreenSize>(appContext.current.screenSize);
  const activePlotCellId = $derived(worldStore.current.activePlotCellId);
  const activeWorldCell = $derived(worldStore.activePlotCell);
  const activePlotState = $derived(activePlotCellId ? plotsStore.get(activePlotCellId) : null);
  const activeMineshaft = $derived(activePlotState?.mineshafts[activePlotState.activeMineshaftIndex] ?? null);
  const activeMine = $derived(activeMineshaft?.mineDepths[activeMineshaft.activeDepthIndex] ?? null);
  const currentShaftLabel = $derived(activeWorldCell?.name ?? 'Mine');
  const nextShaftLabel = $derived(`Shaft ${(activePlotState?.activeMineshaftIndex ?? 0) + 2}`);
  const minerCost = $derived(getMinerCost(activeMine));
  const playerCanBuyMiner = $derived(canBuyMiner(gameState.current.money, activeMine));
  const clearPercent = $derived(activeMine ? getClearProgress(activeMine) : 0);
  const clearStatus = $derived(activeMine ? getClearStatus(activeMine) : 'none');
  const clearStatusLabel = $derived(clearStatus === 'hard' ? 'Hard-cleared' : clearStatus === 'soft' ? 'Soft-cleared' : 'Not cleared');
  const canGoPrevious = $derived((activePlotState?.activeMineshaftIndex ?? 0) > 0);
  const canGoNext = $derived(false);
  const canDigDeeper = $derived(clearStatus === 'hard');
  const canBuyNextShaft = $derived(
    activeMine && activePlotState
      ? activeMine.depth === 0 &&
          clearStatus === 'soft' &&
          gameState.current.money >= 100 &&
          activePlotState.activeMineshaftIndex < engineeringStore.current.maxNorthExpansions
      : false,
  );
  const canBuyStation = $derived(false);

  // --- age-resource pill: collapsed shows what this depth yields, unfolds to all ---
  let resExpanded = $state(false);
  const currentOres = $derived(
    activeMine ? (getActiveResourcesForDepth(activeMine.depth).filter((t) => (RESOURCE_KEYS as string[]).includes(t)) as ResourceKey[]) : [],
  );
  const hasAnyResource = $derived(!!activePlotState && RESOURCE_KEYS.some((k) => activePlotState!.ageResources[k] > 0));
  // Hide the pill entirely when you have nothing and this depth yields nothing.
  const showResourcePill = $derived(hasAnyResource || currentOres.length > 0);
  const shownOres = $derived(resExpanded || currentOres.length === 0 ? RESOURCE_KEYS : currentOres);

  let interval: ReturnType<typeof setInterval>;
  let draggedMiner = $state<Miner | null>(null);
  let draggedPointerId = $state<number | null>(null);
  let dragPos = $state({ x: 0, y: 0 });
  let isDraggingMiner = $state(false);

  function handleMiningTick() {
    if (!activeMine) return;
    const result = runMiningTick(activeMine, gameState.current.money);
    gameState.current.money = result.nextMoney;

    let didEarnResource = false;
    if (activePlotState) {
      for (const [res, amount] of Object.entries(result.resourcesEarned) as [ResourceKey, number][]) {
        activePlotState.ageResources[res] += amount;
        didEarnResource = true;
      }
    }

    if (result.didClearTile || result.didEarnMoney || didEarnResource) debouncedSave();
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
    if (!activePlotState) return;
    const result = digDeeper(gameState.current.settings.worldSeed, 0, activePlotState.activeMineshaftIndex, activeMineshaft);
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    resetDragState();
    debouncedSave();
  }

  function handlePreviousShaft() {
    if (!activePlotState) return;
    const result = handlePreviousShaftAction(activePlotState.activeMineshaftIndex);
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    debouncedSave();
  }

  function handleNextShaft() {
    if (!activePlotState) return;
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
    if (!activePlotState) return;
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

{#if !activePlotState || !isPlotBuilt(activePlotState)}
  <div class="mine-not-built">
    <p>Plot not built yet.</p>
  </div>
{:else if activeMineshaft && activeMine}
  <div class="mine-view size-{screenSize}">
    <MineHeader
      shaftIndex={activePlotState.activeMineshaftIndex}
      shaftTotal={activePlotState.mineshafts.length}
      {canGoPrevious}
      {canGoNext}
      onPreviousShaft={handlePreviousShaft}
      onNextShaft={handleNextShaft}
    />

    <div class="soil-card">
      <div class="soil-top">
        <span class="plot-name">{currentShaftLabel}</span>
        {#if showResourcePill}
          <button
            type="button"
            class="resource-strip"
            aria-label="Mined resources"
            aria-expanded={resExpanded}
            onclick={() => (resExpanded = !resExpanded)}
          >
            {#each shownOres as key (key)}
              {@const meta = RESOURCE_META[key]}
              <span class="resource-chip" class:empty={activePlotState.ageResources[key] === 0} title={meta?.label}>
                <img class="resource-img" src={meta?.img} alt="" />
                <span class="resource-count">{activePlotState.ageResources[key]}</span>
              </span>
            {/each}
            <span class="resource-chevron" class:open={resExpanded} aria-hidden="true">›</span>
          </button>
        {/if}
      </div>
      <MyMeter value={clearPercent} max={100} status={clearStatus} />
      <div class="soil-meta">
        <span>Depth {activeMine.depth}</span>
        <span>{clearStatusLabel} · {clearPercent}%</span>
      </div>
      {#if canBuyNextShaft}
        <Button.Root class="nav-btn" onclick={handleBuyNextShaft}>Buy next shaft</Button.Root>
      {/if}
    </div>

    <MineGrid {activeMine} {draggedMiner} {dragPos} {isDraggingMiner} onMinerPointerDown={handleMinerPointerDown} />

    <div class="mine-actions">
      <Button.Root class="nav-btn dig-deeper-btn" onclick={handleDigDeeperAction} disabled={!canDigDeeper}>Dig deeper ↓</Button.Root>
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

  /* Glass soil card — plot name, meter, depth/status */
  .soil-card {
    flex: 0 0 auto;
    margin: 0 var(--mine-padding);
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--mcc-border);
    border-radius: 14px;
    background: var(--mcc-panel);
    background-image: var(--mcc-glass-sheen);
    box-shadow:
      0 2px 10px rgba(0, 0, 0, 0.18),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .soil-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .plot-name {
    font-family: 'Fredoka', sans-serif;
    font-weight: 800;
    font-size: 1.05rem;
    color: var(--mcc-text-main);
  }

  .soil-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--mcc-text-muted);
  }

  .resource-strip {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    padding: 2px;
    margin: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    border-radius: 999px;
  }

  .resource-chevron {
    color: var(--mcc-text-muted);
    font-weight: 700;
    transition: transform 0.15s ease;
  }

  .resource-chevron.open {
    transform: rotate(90deg);
  }

  .resource-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.8rem;
    line-height: 1.4;
    background: var(--mcc-tile-empty, #262626);
    border: 1px solid var(--mcc-border);
  }

  .resource-chip.empty {
    opacity: 0.45;
  }

  .resource-img {
    width: 1.2em;
    height: 1.2em;
    object-fit: contain;
    display: block;
  }

  .resource-count {
    font-weight: 700;
    color: var(--mcc-text-main);
    font-variant-numeric: tabular-nums;
  }

  .mine-actions {
    flex: 0 0 auto;
    padding: var(--spacing-xs) var(--mine-padding) var(--mine-padding);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .dig-deeper-btn {
    width: 100%;
  }

  :global(.buy-btn) {
    width: 100%;
    min-height: 46px;
    padding: 14px 16px;
    border: none;
    border-radius: 14px;
    color: #06301c;
    font-weight: 800;
    font-size: 1rem;
    cursor: pointer;
    /* sheen layer over the green fill */
    background-image:
      linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.06) 46%, rgba(255, 255, 255, 0)),
      linear-gradient(180deg, var(--mcc-green-top), var(--mcc-green-bot));
    box-shadow:
      0 4px 0 var(--mcc-green-edge),
      0 7px 12px rgba(0, 0, 0, 0.32),
      inset 0 1px 0 rgba(255, 255, 255, 0.6);
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.3);
    transition:
      transform 0.1s ease,
      box-shadow 0.1s ease,
      filter 0.15s ease,
      opacity 0.15s ease;
  }

  :global(.buy-btn:hover:not(:disabled)) {
    filter: brightness(1.05);
  }

  /* Press the chunky button "down" — collapse the 3D edge */
  :global(.buy-btn:active:not(:disabled)) {
    transform: translateY(3px);
    box-shadow:
      0 1px 0 var(--mcc-green-edge),
      0 2px 6px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }

  :global(.buy-btn:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    filter: saturate(0.6);
  }

  .mine-not-built {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1 1 auto;
    color: var(--mcc-text-muted);
    font-size: 1rem;
  }
</style>
