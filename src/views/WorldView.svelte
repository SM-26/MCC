<!-- src/views/WorldView.svelte -->
<script lang="ts">
  import { Button } from 'bits-ui';
  import { gameState } from '../logic/app/gameState.svelte';
  import { navigation } from '../logic/app/navigationStore.svelte';
  import { worldStore } from '../logic/world/worldStore.svelte';
  import WorldGrid from '../components/world/WorldGrid.svelte';
  import type { WorldCell } from '../logic/world/worldTypes';

  let selectedCell: WorldCell | null = null;

  const cells = $derived(worldStore.current.cells);
  const activePlot = $derived(worldStore.activePlot);

  function selectCell(cell: WorldCell) {
    if (cell.type === 'plot') {
      worldStore.setActivePlotById(cell.id);
      selectedCell = cell;
      navigation.setActiveTab('mine');
      return;
    }

    selectedCell = cell;
  }

  function goToMine() {
    navigation.setActiveTab('mine');
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

    <div class="stats">
      <span>Money: {gameState.current.money}</span>
      <span>Active plot: {activePlot?.plotName ?? 'None'}</span>
    </div>
  </header>

  <WorldGrid {cells} onSelectCell={selectCell} />

  <section class="details">
    <div>
      <h3>{selectedCell ? selectedCell.name : 'Selection'}</h3>

      {#if selectedCell}
        <p>Type: {selectedCell.type}</p>
        <p>Ring: {selectedCell.ring}</p>
        <p>Coords: {selectedCell.q}, {selectedCell.r}</p>
        <p>Status: {selectedCell.discovered ? 'Discovered' : 'Hidden'}</p>

        {#if selectedCell.type === 'city'}
          <p>Passenger destination.</p>
        {:else if selectedCell.type === 'factory'}
          <p>Cargo destination.</p>
        {:else if selectedCell.type === 'plot'}
          <p>Plot tile selected. Mine and station views will use this tile.</p>
        {/if}
      {:else}
        <p>Click a tile to inspect it.</p>
      {/if}
    </div>

    <div class="actions">
      <Button.Root class="mini-btn" onclick={goToMine} disabled={!activePlot}>Go to mine</Button.Root>
      <Button.Root class="mini-btn" onclick={goToStation} disabled={!activePlot}>Go to station</Button.Root>
      <Button.Root class="mini-btn" onclick={clearSelection}>Clear</Button.Root>
    </div>
  </section>
</div>

<style>
  .world-view {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .stats {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    opacity: 0.9;
  }

  .details {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    border: 1px solid var(--mcc-border);
    border-radius: 12px;
    background: var(--mcc-bg-surface);
    padding: 16px;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: end;
  }

  .mini-btn {
    border: 1px solid var(--mcc-border);
    border-radius: 10px;
    padding: 10px 14px;
    background: var(--mcc-bg-surface);
    color: var(--mcc-text-main);
    cursor: pointer;
  }

  .mini-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
