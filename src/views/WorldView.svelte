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
  import { engineeringStore } from '../logic/engineering/engineeringStore.svelte';
  import { log } from '../lib/logger';

  const cells = $derived(worldStore.current.cells);
  const activePlotCell = $derived(worldStore.activePlotCell);
  const inspectedCell = $derived(
    worldStore.current.inspectedCellId ? (worldStore.current.cells.find((cell) => cell.id === worldStore.current.inspectedCellId) ?? null) : null,
  );
  const inspectedCellId = $derived(inspectedCell?.id ?? null);

  function selectCell(cell: WorldCell) {
    worldStore.setInspectedCellId(cell.id);
  }

  function selectPlot(cell: WorldCell) {
    worldStore.setInspectedCellId(cell.id);
    if (cell.type === 'plot') {
      worldStore.setActivePlotCellId(cell.id);
      debouncedSave();
    }
  }

  function openMine(cell: WorldCell) {
    if (cell.type !== 'plot') return;
    worldStore.setActivePlotCellId(cell.id);
    worldStore.setInspectedCellId(cell.id);
    debouncedSave();
    navigation.setActiveTab('mine');
  }

  function goToMine() {
    if (activePlotCell) navigation.setActiveTab('mine');
  }

  function goToStation() {
    if (activePlotCell) navigation.setActiveTab('station');
  }

  function clearSelection() {
    worldStore.setInspectedCellId(null);
  }

  const inspectedPlotBuilt = $derived(inspectedCell?.type === 'plot' && !!plotsStore.get(inspectedCell.id) && isPlotBuilt(plotsStore.get(inspectedCell.id)!));

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

  <WorldGrid
    {cells}
    selectedCellId={inspectedCellId}
    onSelectCell={selectCell}
    onSelectPlot={selectPlot}
    onClearSelection={clearSelection}
    onOpenMine={openMine}
  />

  <section class="inspect-card">
    {#if inspectedCell}
      <div class="inspect-top">
        <div class="inspect-identity">
          {#if inspectedCell.discovered || gameState.current.settings.devMode}
            <h3 class="cell-name">{inspectedCell.name}</h3>
            <p class="cell-sub">
              {inspectedCell.type === 'plot' ? 'Plot' : inspectedCell.type === 'city' ? 'City' : inspectedCell.type === 'factory' ? 'Factory' : inspectedCell.type}
              · Ring {inspectedCell.ring}
              · {inspectedCell.discovered ? 'Discovered' : 'Hidden'}
              {#if gameState.current.settings.devMode}&nbsp;({inspectedCell.q}, {inspectedCell.r}){/if}
            </p>
          {:else}
            <h3 class="cell-name">???</h3>
            <p class="cell-sub">Ring {inspectedCell.ring} · Hidden</p>
          {/if}
        </div>
        {#if inspectedCell.type === 'plot' && inspectedPlotBuilt}
          <span class="state-pill">Active</span>
        {/if}
      </div>

      <p class="inspect-context">
        {#if !inspectedCell.discovered && !gameState.current.settings.devMode}
          This tile hasn't been discovered yet.
        {:else if inspectedCell.type === 'city'}
          Passenger destination.
        {:else if inspectedCell.type === 'factory'}
          Cargo destination.
        {:else if inspectedCell.type === 'plot'}
          {inspectedPlotBuilt ? 'Mine and station views will use this tile.' : 'Under construction. Gather coal and money to build this plot.'}
        {/if}
      </p>

      {#if inspectedCell.type === 'plot' && inspectedCell.discovered}
        <div class="inspect-actions">
          {#if !inspectedPlotBuilt}
            <Button.Root class="glass-btn" onclick={() => buildPlotAction(inspectedCell!)}>Build plot</Button.Root>
          {/if}
          <Button.Root class="glass-btn" onclick={goToMine} disabled={!inspectedPlotBuilt}>Go to mine</Button.Root>
          <Button.Root class="glass-btn" onclick={goToStation} disabled={!inspectedPlotBuilt}>Go to station</Button.Root>
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
