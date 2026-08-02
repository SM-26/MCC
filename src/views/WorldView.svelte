<!-- src/views/WorldView.svelte -->
<script lang="ts">
  import { Button } from 'bits-ui';
  import { gameState } from '../logic/app/gameState.svelte';
  import { navigation } from '../logic/app/navigationStore.svelte';
  import { worldStore } from '../logic/world/worldStore.svelte';
  import WorldGrid from '../components/world/WorldGrid.svelte';
  import type { WorldCell } from '../logic/world/worldTypes';
  import { debouncedSave } from '../logic/save/save.svelte';
  import { plotsStore } from '../logic/mine/plotsStore.svelte';
  import { isPlotBuilt } from '../logic/mine/mineTypes';
  import { ensurePlotScaffold, tryBuildPlot } from '../logic/mine/mineActions';
  import { onMount } from 'svelte';
  import { dispatchExplore, findExplorerTrain, getExploreTripsByTarget, getTravelEta } from '../logic/station/stationActions';
  import { getTripRemainingMs } from '../logic/station/stationTypes';
  import { formatCountdown } from '../components/station/stationSelectors';
  import { triggerMobileToast } from '../components/GameTooltip.svelte';
  import { engineeringStore } from '../logic/engineering/engineeringStore.svelte';
  import { log } from '../lib/logger';

  const cells = $derived(worldStore.current.cells);
  const inspectedCell = $derived(
    worldStore.current.inspectedCellId ? (worldStore.current.cells.find((cell) => cell.id === worldStore.current.inspectedCellId) ?? null) : null,
  );
  const inspectedCellId = $derived(inspectedCell?.id ?? null);

  // Single click inspects, and only inspects. Activating a plot is a commitment
  // — it changes what the Mine and Station tabs operate on — so it takes the
  // deliberate gesture.
  function selectCell(cell: WorldCell) {
    worldStore.setInspectedCellId(cell.id);
  }

  function activatePlot(cell: WorldCell) {
    if (cell.type !== 'plot' || !(cell.discovered || gameState.current.settings.devMode)) return;

    // Double-tapping the plot that's *already* active opens its mine, so
    // reaching another plot's mine is two double-taps: one to move there, one
    // to go in.
    if (cell.id === worldStore.current.activePlotCellId) {
      navigation.setActiveTab('mine');
      return;
    }

    worldStore.setActivePlotCellId(cell.id);
    worldStore.setInspectedCellId(cell.id);
    debouncedSave();
  }

  /**
   * Activate first, then navigate. These used to guard on `activePlotCell`, so
   * with single-click no longer activating they would have become dead buttons
   * for any plot that wasn't already the active one.
   */
  function openInspected(tab: 'mine' | 'station') {
    if (!inspectedCell || !inspectedPlotBuilt) return;
    worldStore.setActivePlotCellId(inspectedCell.id);
    debouncedSave();
    navigation.setActiveTab(tab);
  }

  function clearSelection() {
    worldStore.setInspectedCellId(null);
  }

  const inspectedPlotBuilt = $derived(inspectedCell?.type === 'plot' && !!plotsStore.get(inspectedCell.id) && isPlotBuilt(plotsStore.get(inspectedCell.id)!));

  // --- fog exploration: send an idle train from the active plot to reveal a cell ---
  const activePlotCellId = $derived(worldStore.current.activePlotCellId);
  const activePlotState = $derived(activePlotCellId ? plotsStore.get(activePlotCellId) : null);
  // Only a train whose standing order is Exploration may be sent into the fog.
  const idleTrain = $derived(findExplorerTrain(activePlotState ?? null));

  // Ticking clock so the countdown on inbound fog tiles actually counts down.
  let now = $state(Date.now());
  onMount(() => {
    const timer = window.setInterval(() => (now = Date.now()), 1000);
    return () => window.clearInterval(timer);
  });

  const exploreTrips = $derived(getExploreTripsByTarget(plotsStore.current));
  const exploreTargets = $derived(new Set(exploreTrips.keys()));
  const exploreEtaByCell = $derived(
    new Map([...exploreTrips].map(([cellId, trip]) => [cellId, formatCountdown(getTripRemainingMs(trip, now))])),
  );
  const alreadyExploring = $derived(inspectedCell ? exploreTargets.has(inspectedCell.id) : false);
  const isInspectedActive = $derived(inspectedCell !== null && inspectedCell.id === activePlotCellId);
  const exploreEtaMs = $derived(
    inspectedCell && !inspectedCell.discovered && idleTrain && activePlotCellId ? getTravelEta(idleTrain, activePlotCellId, inspectedCell.id) : null,
  );

  function exploreInspected() {
    if (!inspectedCell || !activePlotCellId || !idleTrain) return;
    const result = dispatchExplore(idleTrain, worldStore.current, inspectedCell.id, activePlotCellId, Date.now(), exploreTargets);
    if (!result.ok) {
      if (result.message) triggerMobileToast(result.message);
      return;
    }
    log.info('WorldView', `explore dispatched to ${inspectedCell.id}`);
    debouncedSave();
  }

  function buildPlotAction(cell: WorldCell) {
    ensurePlotScaffold(cell.id);
    const result = tryBuildPlot(cell.id, gameState.current.settings.worldSeed, engineeringStore.current.resetCount, gameState.current.money);
    if (result.ok) {
      gameState.setMoney(result.nextMoney);
      log.info('WorldView', `Plot ${cell.id} built; money now ${result.nextMoney}`);
      debouncedSave();
    } else {
      log.debug('WorldView', `Build plot ${cell.id} failed (coal or money insufficient)`);
    }
  }
</script>

<div class="world-view">
  <header class="world-header">
    <h2 class="world-title">World Map</h2>
    <p class="world-sub">Choose a plot, city, or factory.</p>
  </header>

  <WorldGrid {cells} selectedCellId={inspectedCellId} {exploreEtaByCell} onSelectCell={selectCell} onClearSelection={clearSelection} onActivatePlot={activatePlot} />

  <section class="inspect-card">
    {#if inspectedCell}
      <div class="inspect-top">
        <div class="inspect-identity">
          {#if inspectedCell.discovered || gameState.current.settings.devMode}
            <h3 class="cell-name">{inspectedCell.name}</h3>
            <p class="cell-sub">
              {inspectedCell.type === 'plot'
                ? 'Plot'
                : inspectedCell.type === 'city'
                  ? 'City'
                  : inspectedCell.type === 'factory'
                    ? 'Factory'
                    : inspectedCell.type}
              · Ring {inspectedCell.ring}
              · {inspectedCell.discovered ? 'Discovered' : 'Hidden'}
              {#if gameState.current.settings.devMode}&nbsp;({inspectedCell.q}, {inspectedCell.r}){/if}
            </p>
          {:else}
            <h3 class="cell-name">???</h3>
            <p class="cell-sub">Ring {inspectedCell.ring} · Hidden</p>
          {/if}
        </div>
        <!-- Reflects the plot the Mine/Station tabs actually operate on, not
             merely "a built plot is being looked at", which is what this used
             to say for every built plot. -->
        {#if isInspectedActive}
          <span class="state-pill">Active</span>
        {/if}
      </div>

      <p class="inspect-context">
        {#if !inspectedCell.discovered && !gameState.current.settings.devMode}
          This tile hasn't been discovered yet.
        {:else if inspectedCell.type === 'city'}
          Passenger destination.
        {:else if inspectedCell.type === 'factory'}
          <!-- Name the resource: "cargo destination" alone never told the player what
               this factory actually buys. -->
          {#if inspectedCell.acceptedResources?.length}
            Cargo destination · buys {inspectedCell.acceptedResources.join(', ')}.
          {:else}
            Cargo destination.
          {/if}
        {:else if inspectedCell.type === 'plot'}
          {inspectedPlotBuilt
            ? isInspectedActive
              ? 'Mine and station views use this tile.'
              : 'Double-tap to make this the active plot.'
            : 'Under construction. Gather coal and money to build this plot.'}
        {/if}
      </p>

      {#if inspectedCell.type === 'plot' && inspectedCell.discovered}
        <div class="inspect-actions">
          {#if !inspectedPlotBuilt}
            <Button.Root class="glass-btn" onclick={() => buildPlotAction(inspectedCell!)}>Build plot</Button.Root>
          {/if}
          <Button.Root class="glass-btn" onclick={() => openInspected('mine')} disabled={!inspectedPlotBuilt}>Go to mine</Button.Root>
          <Button.Root class="glass-btn" onclick={() => openInspected('station')} disabled={!inspectedPlotBuilt}>Go to station</Button.Root>
        </div>
      {:else if !inspectedCell.discovered}
        <div class="inspect-actions">
          {#if alreadyExploring}
            <p class="cell-sub">A train is already on its way here.</p>
          {:else if !activePlotState}
            <p class="cell-sub">Build a plot with a station to send explorers.</p>
          {:else if !idleTrain}
            <p class="cell-sub">No train on scout duty. Set a train's route to Exploration in your station.</p>
          {:else}
            <Button.Root class="glass-btn" onclick={exploreInspected}>
              Send train to explore{exploreEtaMs !== null ? ` (~${Math.ceil(exploreEtaMs / 1000)}s)` : ''}
            </Button.Root>
          {/if}
        </div>
      {/if}
    {:else}
      <p class="inspect-empty">Click a tile to inspect it.</p>
    {/if}
  </section>
</div>

<style>
  .world-view {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    padding: var(--spacing-md) var(--spacing-md) var(--spacing-sm);
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
  }

  .world-header {
    flex: 0 0 auto;
  }

  .world-title {
    font-family: 'Fredoka', sans-serif;
    font-weight: 800;
    font-size: 1.4rem;
    color: var(--mcc-text-main);
    margin: 0;
  }

  .world-sub {
    font-size: 0.85rem;
    color: var(--mcc-text-muted);
    margin: 2px 0 0;
  }

  /* Glass inspect card */
  .inspect-card {
    flex: 0 0 auto;
    border: 1px solid var(--mcc-border);
    border-radius: 14px;
    background: var(--mcc-panel);
    background-image: var(--mcc-glass-sheen);
    box-shadow:
      0 2px 12px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.12);
    padding: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .inspect-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-sm);
  }

  .inspect-identity {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .cell-name {
    font-family: 'Fredoka', sans-serif;
    font-weight: 800;
    font-size: 1.15rem;
    color: var(--mcc-text-main);
    margin: 0;
  }

  .cell-sub {
    font-size: 0.78rem;
    color: var(--mcc-text-muted);
    margin: 0;
  }

  .state-pill {
    flex-shrink: 0;
    padding: 3px 10px;
    border: 1px solid var(--mcc-border);
    border-radius: 999px;
    background: var(--mcc-surface-2);
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--mcc-text-main);
  }

  .inspect-context {
    font-size: 0.82rem;
    color: var(--mcc-text-muted);
    margin: 0;
  }

  .inspect-empty {
    font-size: 0.85rem;
    color: var(--mcc-text-muted);
    text-align: center;
    padding: var(--spacing-sm) 0;
    margin: 0;
    border: 1px dashed var(--mcc-border);
    border-radius: 10px;
  }

  .inspect-actions {
    display: flex;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
  }

  /* Glass action buttons */
  :global(.glass-btn) {
    padding: 8px 14px;
    border: 1px solid var(--mcc-border);
    border-radius: 12px;
    background-color: var(--mcc-surface-2);
    background-image: var(--mcc-btn-sheen);
    color: var(--mcc-text-main);
    font-weight: 700;
    font-size: 0.85rem;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
    cursor: pointer;
    transition:
      filter 0.15s ease,
      transform 0.1s ease;
  }

  :global(.glass-btn:hover:not(:disabled)) {
    filter: brightness(1.12);
  }

  :global(.glass-btn:active:not(:disabled)) {
    transform: translateY(1px);
  }

  :global(.glass-btn:disabled),
  :global(.glass-btn[data-disabled]) {
    opacity: 0.42;
    cursor: not-allowed;
  }
</style>
