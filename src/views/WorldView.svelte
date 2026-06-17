<!-- src/views/WorldView.svelte -->
<script lang="ts">
  import { Button } from 'bits-ui';
  import { gameState } from '../logic/app/gameState.svelte';
  import { navigation } from '../logic/app/navigationStore.svelte';
  import { worldStore } from '../logic/world/worldStore.svelte';
  import WorldGrid from '../components/world/WorldGrid.svelte';
  import type { WorldCell } from '../logic/world/worldTypes';

  let selectedCell = $state<WorldCell | null>(null);

  const cells = $derived(worldStore.current.cells);
  const activePlot = $derived(worldStore.activePlot);
  const selectedCellId = $derived(selectedCell?.id ?? activePlot?.cellId ?? null);

  function selectCell(cell: WorldCell) {
    selectedCell = cell;
  }

  function openMine(cell: WorldCell) {
    const plot = worldStore.current.plots.find((entry) => entry.cellId === cell.id || entry.plotId === `plot-${cell.id}`);
    if (!plot) {
      return;
    }

    worldStore.setActivePlotById(plot.plotId);
    selectedCell = cell;
    navigation.setActiveTab('mine');
  }

  function goToMine() {
    if (activePlot) navigation.setActiveTab('mine');
  }

  function goToStation() {
    navigation.setActiveTab('station');
  }

  function clearSelection() {
    selectedCell = null;
  }
</script>

<div class="world-view">
  <header class="topbar">
    <div>
      <h2>World Map</h2>
      <p>Choose a plot, city, or factory.</p>
    </div>
  </header>

  <WorldGrid {cells} {selectedCellId} onSelectCell={selectCell} onSelectPlot={selectCell} onClearSelection={clearSelection} onOpenMine={openMine} />

  <!-- <Button.Root onclick={goToMine} disabled={!activePlot}>Go to mine</Button.Root> -->
  <section class="details">
    <div>
      {#if selectedCell?.discovered || gameState.current.settings.devMode}
        <h3>{selectedCell ? selectedCell.name : 'Selection'}</h3>
      {/if}

      {#if selectedCell}
        {#if selectedCell.discovered || gameState.current.settings.devMode}
          <p>Type: {selectedCell.type}</p>
        {:else}
          <p>Type: ???</p>
        {/if}

        <p>Ring: {selectedCell.ring}</p>
        {#if gameState.current.settings.devMode}
          <p>Coords: {selectedCell.q}, {selectedCell.r}</p>
        {/if}
        <p>Status: {selectedCell.discovered ? 'Discovered' : 'Hidden'}</p>
        {#if selectedCell.discovered}
          {#if selectedCell.type === 'city'}
            <p>Passenger destination.</p>
          {:else if selectedCell.type === 'factory'}
            <p>Cargo destination.</p>
          {:else if selectedCell.type === 'plot'}
            <p>Plot tile selected. Mine and station views will use this tile.</p>
          {/if}
        {/if}
      {:else}
        <p>Click a tile to inspect it.</p>
      {/if}
    </div>

    <div class="actions">
      {#if selectedCell?.type === 'plot'}
        <Button.Root class="mini-btn" onclick={goToMine} disabled={!activePlot}>Go to mine</Button.Root>
        <Button.Root class="mini-btn" onclick={goToStation} disabled={!activePlot}>Go to station</Button.Root>
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
