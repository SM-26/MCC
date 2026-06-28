<!-- src/views/WorldView.svelte -->
<script lang="ts">
  import { Button } from 'bits-ui';
  import { gameState } from '../logic/app/gameState.svelte';
  import { navigation } from '../logic/app/navigationStore.svelte';
  import { worldStore } from '../logic/world/worldStore.svelte';
  import WorldGrid from '../components/world/WorldGrid.svelte';
  import type { WorldCell } from '../logic/world/worldTypes';
  import { debouncedSave } from '../logic/save/save.svelte';

  const cells = $derived(worldStore.current.cells);
  const activePlotCell = $derived(worldStore.activePlotCell);
  const inspectedCell = $derived(
    worldStore.current.inspectedCellId
      ? (worldStore.current.cells.find((cell) => cell.id === worldStore.current.inspectedCellId) ?? null)
      : null,
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
</script>

<div class="world-view">
  <header class="topbar">
    <div>
      <h2>World Map</h2>
      <p>Choose a plot, city, or factory.</p>
    </div>
  </header>

  <WorldGrid {cells} selectedCellId={inspectedCellId} onSelectCell={selectCell} onSelectPlot={selectPlot} onClearSelection={clearSelection} onOpenMine={openMine} />

  <section class="details">
    <div>
      {#if inspectedCell?.discovered || gameState.current.settings.devMode}
        <h3>{inspectedCell ? inspectedCell.name : 'Selection'}</h3>
      {/if}

      {#if inspectedCell}
        {#if inspectedCell.discovered || gameState.current.settings.devMode}
          <p>Type: {inspectedCell.type}</p>
        {:else}
          <p>Type: ???</p>
        {/if}

        <p>Ring: {inspectedCell.ring}</p>
        {#if gameState.current.settings.devMode}
          <p>Coords: {inspectedCell.q}, {inspectedCell.r}</p>
        {/if}
        <p>Status: {inspectedCell.discovered ? 'Discovered' : 'Hidden'}</p>
        {#if inspectedCell.discovered}
          {#if inspectedCell.type === 'city'}
            <p>Passenger destination.</p>
          {:else if inspectedCell.type === 'factory'}
            <p>Cargo destination.</p>
          {:else if inspectedCell.type === 'plot'}
            <p>Plot tile selected. Mine and station views will use this tile.</p>
          {/if}
        {/if}
      {:else}
        <p>Click a tile to inspect it.</p>
      {/if}
    </div>

    <div class="actions">
      {#if inspectedCell?.type === 'plot'}
        <Button.Root class="mini-btn" onclick={goToMine} disabled={!activePlotCell}>Go to mine</Button.Root>
        <Button.Root class="mini-btn" onclick={goToStation} disabled={!activePlotCell}>Go to station</Button.Root>
      {/if}
    </div>
  </section>
</div>

<style>
  .world-view {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 2px var(--spacing-md);
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .details {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    border: 1px solid var(--mcc-border);
    border-radius: 12px;
    background: var(--mcc-bg-surface);
    padding: 2px var(--spacing-md);
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: end;
  }

  @media (max-width: 800px) {
    .details {
      flex-direction: column;
    }

    .actions {
      align-items: stretch;
    }
  }
</style>
