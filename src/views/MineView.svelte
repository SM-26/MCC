<!-- /src/views/MineView.svelte -->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Button } from 'bits-ui';

  import { debouncedSave } from '../logic/save/save.svelte';
  import { getClearProgress, getClearStatus, getPlotStats } from '../logic/mine/mineGen';
  import {
    BASE_SHAFT_COST,
    buyMiner,
    canBuyMiner,
    digDeeper,
    getMinerCost,
    handleNextShaftAction,
    handlePreviousShaftAction,
    moveOrMergeMiner,
  } from '../logic/mine/mineActions';
  import { triggerMobileToast } from '../components/GameTooltip.svelte';
  import MineHeader from '../components/mine/MineHeader.svelte';
  import MineGrid from '../components/mine/MineGrid.svelte';
  import MyMeter from '../components/MyMeter.svelte';
  import { AGE_ADVANCE_COST, AGE_RESOURCE, advanceAge, getMaxDepthForAge, getNextAge } from '../logic/mine/ageProgression';
  import { RESOURCE_KEYS, RESOURCE_META, type ResourceKey } from '../logic/mine/mineLabels';
  import { getActiveResourcesForDepth, getFirstDepthForResource } from '../logic/mine/mineGen';
  import { log } from '../lib/logger';

  import { appContext } from '../logic/app/appContext.svelte';
  import { engineeringStore } from '../logic/engineering/engineeringStore.svelte';
  import { gameState } from '../logic/app/gameState.svelte';
  import { plotsStore } from '../logic/mine/plotsStore.svelte';
  import { worldStore } from '../logic/world/worldStore.svelte';
  import { getMineDepthByDepth, isPlotBuilt } from '../logic/mine/mineTypes';

  import type { ScreenSize } from '../lib/sizes';
  import type { Miner, Mineshaft } from '../logic/mine/mineTypes';

  const screenSize = $derived<ScreenSize>(appContext.current.screenSize);
  const activePlotCellId = $derived(worldStore.current.activePlotCellId);
  const activeWorldCell = $derived(worldStore.activePlotCell);
  const activePlotState = $derived(activePlotCellId ? plotsStore.get(activePlotCellId) : null);
  const activeMineshaft = $derived(activePlotState?.mineshafts[activePlotState.activeMineshaftIndex] ?? null);
  const activeMine = $derived(activeMineshaft?.mineDepths[activeMineshaft.activeDepthIndex] ?? null);
  const currentShaftLabel = $derived(activeWorldCell?.name ?? 'Mine');
  const minerCost = $derived(getMinerCost(activeMine));
  const playerCanBuyMiner = $derived(canBuyMiner(gameState.current.money, activeMine));
  const clearPercent = $derived(activeMine ? getClearProgress(activeMine) : 0);
  const clearStatus = $derived(activeMine ? getClearStatus(activeMine) : 'none');
  const clearStatusLabel = $derived(clearStatus === 'hard' ? 'Hard-cleared' : clearStatus === 'soft' ? 'Soft-cleared' : 'Not cleared');
  const canGoPrevious = $derived((activePlotState?.activeMineshaftIndex ?? 0) > 0);
  // The shaft gate is about its surface, not the depth you're standing on, digging
  // down needs a hard-clear, so below depth 0 this is already satisfied.
  const surfaceClearStatus = $derived.by(() => {
    const surface = activeMineshaft ? getMineDepthByDepth(activeMineshaft, 0) : null;
    return surface ? getClearStatus(surface) : 'none';
  });
  // Moving to the next shaft needs this shaft's surface cleared (soft or hard) and
  // the shaft already bought. Works at any depth. Buying is the button's job.
  const canGoNext = $derived(
    activeMine && activePlotState ? surfaceClearStatus !== 'none' && activePlotState.activeMineshaftIndex + 1 < activePlotState.mineshafts.length : false,
  );
  // Buying is only on offer while the next shaft doesn't exist yet, once bought,
  // moving between shafts is the › arrow's job, not a second button's.
  const nextShaftExists = $derived(activePlotState ? activePlotState.activeMineshaftIndex + 1 < activePlotState.mineshafts.length : false);

  // --- age advancement ---
  const nextAge = $derived(activePlotState ? getNextAge(activePlotState.currentAge) : null);
  const advanceCost = $derived(nextAge ? AGE_ADVANCE_COST[nextAge] : null);

  // Deepest depth this plot has actually dug, across every shaft.
  const deepestReached = $derived(
    activePlotState ? activePlotState.mineshafts.reduce((max, shaft) => shaft.mineDepths.reduce((m, d) => Math.max(m, d.depth), max), 0) : 0,
  );
  // Don't dangle an age the player has no idea how to pay for: the advance offer
  // appears only once they've reached the depth where its ore actually shows up.
  // (Reaching it is a *reveal* condition, not a prerequisite, the cost is still
  // just resources + money, and ore pools across shafts.)
  const nextAgeResource = $derived(nextAge ? AGE_RESOURCE[nextAge] : null);
  const showAdvanceAge = $derived(!nextAge || (nextAgeResource !== null && deepestReached >= getFirstDepthForResource(nextAgeResource)));
  const advanceCostLabel = $derived(
    advanceCost
      ? [`$${advanceCost.money}`, ...(Object.entries(advanceCost.resources) as [ResourceKey, number][]).map(([res, amount]) => `${amount} ${res}`)].join(' + ')
      : '',
  );
  // Blockers read as full sentences: they are toasted on click, not rendered
  // inline. '' means the action can go ahead.
  const advanceBlocker = $derived.by(() => {
    if (!activePlotState) return 'No active plot';
    if (!advanceCost) return 'Already at the final age';
    const parts: string[] = [];
    if (gameState.current.money < advanceCost.money) parts.push(`$${advanceCost.money - gameState.current.money}`);
    for (const [res, amount] of Object.entries(advanceCost.resources) as [ResourceKey, number][]) {
      const have = activePlotState.ageResources[res];
      if (have < amount) parts.push(`${amount - have} ${res}`);
    }
    return parts.length > 0 ? `Need ${parts.join(', ')} more to advance!` : '';
  });
  const digBlocker = $derived.by(() => {
    if (!activeMine || !activePlotState) return 'No active mine';
    if (clearStatus !== 'hard') {
      // Name what is actually left. Rubble only exists in the top bracket, so
      // below depth 5 the old fixed "clear all rubble" message was simply wrong.
      const stats = getPlotStats(activeMine);
      const resourcesLeft = RESOURCE_KEYS.reduce((sum, key) => sum + (stats[key] ?? 0), 0);
      const remaining = [stats.rubble > 0 ? 'rubble' : '', resourcesLeft > 0 ? 'resources' : '', stats.dirt > 0 ? 'dirt' : ''].filter(Boolean);
      return remaining.length > 0 ? `Clear the remaining ${remaining.join(' and ')} first!` : 'Clear this level first!';
    }
    if (activeMine.depth + 1 > getMaxDepthForAge(activePlotState.currentAge)) return `Advance to ${nextAge} to dig deeper`;
    return '';
  });
  const nextShaftBlocker = $derived.by(() => {
    if (!activeMine || !activePlotState) return 'No active mine';
    if (surfaceClearStatus === 'none') return 'Clear all of the rubble first!';
    if (activePlotState.activeMineshaftIndex >= engineeringStore.current.maxMineshafts) return 'You reached the shaft limit!';
    if (gameState.current.money < BASE_SHAFT_COST) return `Need $${BASE_SHAFT_COST - gameState.current.money} more for a new shaft!`;
    return '';
  });

  // --- age-resource pill: collapsed shows what this depth yields, unfolds to all ---
  let resExpanded = $state(false);
  const currentOres = $derived(
    activeMine ? (getActiveResourcesForDepth(activeMine.depth).filter((t) => (RESOURCE_KEYS as string[]).includes(t)) as ResourceKey[]) : [],
  );
  const hasAnyResource = $derived(!!activePlotState && RESOURCE_KEYS.some((k) => activePlotState!.ageResources[k] > 0));
  // Hide the pill entirely when you have nothing and this depth yields nothing.
  const showResourcePill = $derived(hasAnyResource || currentOres.length > 0);
  const shownOres = $derived(resExpanded || currentOres.length === 0 ? RESOURCE_KEYS : currentOres);

  let draggedMiner = $state<Miner | null>(null);
  let draggedPointerId = $state<number | null>(null);
  let dragPos = $state({ x: 0, y: 0 });
  let isDraggingMiner = $state(false);

  // Mining itself is driven by the app-level heartbeat in App.svelte
  // (`runMiningForAllPlots`), so every shaft of every plot produces whether or
  // not this view is mounted. This component only renders it.

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
    if (digBlocker) {
      triggerMobileToast(digBlocker);
      return;
    }
    const result = digDeeper(gameState.current.settings.worldSeed, 0, activePlotState.activeMineshaftIndex, activeMineshaft, activePlotState.currentAge);
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    resetDragState();
    debouncedSave();
  }

  function handleAdvanceAge() {
    if (!activePlotState) return;
    // The blocker names the exact shortfall; the action's own message is the
    // fallback for anything the blocker doesn't model.
    if (advanceBlocker) {
      triggerMobileToast(advanceBlocker);
      return;
    }
    const result = advanceAge(activePlotState);
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    debouncedSave();
  }

  function handlePreviousShaft() {
    if (!activePlotState || !activePlotCellId) return;
    const result = handlePreviousShaftAction(activePlotCellId, activePlotState.activeMineshaftIndex);
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    debouncedSave();
  }

  /**
   * Walking to the next shaft and buying one are the same action underneath
   * (handleNextShaftAction only charges when the shaft doesn't exist yet), but
   * they are NOT the same gate. Running the purchase blockers before navigating
   * is what made "›" fail with "Need $100" once you owned shaft 2 and spent down.
   */
  function runNextShaft() {
    if (!activePlotState || !activePlotCellId) return;
    const result = handleNextShaftAction({
      worldSeed: gameState.current.settings.worldSeed,
      resetCount: 0,
      maxShafts: engineeringStore.current.maxMineshafts,
      activeShaftIndex: activePlotState.activeMineshaftIndex,
      cellId: activePlotCellId,
      activeMineshaft,
      activeMine,
    });

    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }

    resetDragState();
    debouncedSave();
  }

  /** The "›" arrow: pure navigation, no purchase gates. */
  function handleGoToNextShaft() {
    runNextShaft();
  }

  /** The buy button: gated, since this one can actually spend money. */
  function handleBuyNextShaft() {
    if (nextShaftBlocker) {
      triggerMobileToast(nextShaftBlocker);
      return;
    }
    runNextShaft();
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
    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: false });
    window.addEventListener('pointerup', handleGlobalPointerUp, { passive: false });
    window.addEventListener('pointercancel', handleGlobalPointerCancel, { passive: false });
  });

  onDestroy(() => {
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
      onNextShaft={handleGoToNextShaft}
    />

    <div class="soil-card">
      <div class="soil-top">
        <span class="plot-name">{currentShaftLabel}</span>
        {#if showResourcePill}
          <button type="button" class="resource-strip" aria-label="Mined resources" aria-expanded={resExpanded} onclick={() => (resExpanded = !resExpanded)}>
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
      <!-- Side by side: these are both once-in-a-while actions and stacking them
           cost a row of vertical space the grid needs more. -->
      {#if !nextShaftExists || showAdvanceAge}
        <div class="soil-actions">
          {#if !nextShaftExists}
            <Button.Root class="nav-btn" onclick={handleBuyNextShaft} aria-disabled={nextShaftBlocker !== ''}>Buy next shaft · ${BASE_SHAFT_COST}</Button.Root>
          {/if}
          {#if showAdvanceAge}
            <Button.Root class="nav-btn" onclick={handleAdvanceAge} aria-disabled={advanceBlocker !== ''}>
              {#if nextAge}Advance to {nextAge} · {advanceCostLabel}{:else}Age {activePlotState.currentAge}{/if}
            </Button.Root>
          {/if}
        </div>
      {/if}
    </div>

    <MineGrid {activeMine} {draggedMiner} {dragPos} {isDraggingMiner} onMinerPointerDown={handleMinerPointerDown} />

    <div class="mine-actions">
      <Button.Root class="nav-btn dig-deeper-btn" onclick={handleDigDeeperAction} aria-disabled={digBlocker !== ''}>Dig deeper ↓</Button.Root>
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

  /* Glass soil card, plot name, meter, depth/status */
  /* The two buttons share a row. `:global` reaches bits-ui's own element, but
     the scoped parent keeps this from being a second definition of .nav-btn,
     MineHeader still owns that class outright. */
  .soil-actions {
    display: flex;
    gap: var(--spacing-sm);
  }

  .soil-actions > :global(.nav-btn) {
    flex: 1 1 0;
    min-width: 0;
  }

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

  /* Press the chunky button "down", collapse the 3D edge */
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
