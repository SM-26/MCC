<!-- /src/views/StationView.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  import StationDashboard from '../components/station/StationDashboard.svelte';
  import PlatformView from '../components/station/PlatformView.svelte';
  import TrainYardDrawer from '../components/station/TrainYardDrawer.svelte';

  import { debouncedSave } from '../logic/save/save.svelte';
  import { plotsStore } from '../logic/mine/plotsStore.svelte';
  import { worldStore } from '../logic/world/worldStore.svelte';
  import { stationUi } from '../logic/station/stationUi.svelte';
  import type { Platform } from '../logic/station/stationTypes';

  // --- source of truth: the active plot's embedded station ---
  const activePlotCellId = $derived(worldStore.current.activePlotCellId);
  const activePlotState = $derived(activePlotCellId ? plotsStore.get(activePlotCellId) : null);
  const station = $derived(activePlotState?.station ?? null);

  // Focus lives on the persisted activePlatformId; stationUi only knows which
  // part is on screen. The ?? fallbacks cover saves written before the field.
  const activePlatform = $derived<Platform | null>(
    station?.platforms.find((p) => p.id === (station.activePlatformId ?? null)) ?? station?.platforms[0] ?? null,
  );

  // A platform can vanish under us (recall, reset); never strand the drill-in.
  const mode = $derived(stationUi.current.mode === 'platform' && station && activePlatform ? 'platform' : 'dashboard');

  // --- local clock, drives every countdown and meter on the screen ---
  let now = $state(Date.now());
  onMount(() => {
    // UI-only state is per-visit: reopening the tab lands on the dashboard.
    stationUi.reset();
    const timer = window.setInterval(() => (now = Date.now()), 1000);
    return () => window.clearInterval(timer);
  });

  function focusPlatform(platform: Platform) {
    if (!station) {
      return;
    }
    station.activePlatformId = platform.id;
    debouncedSave();
  }

  function handleOpenPlatform(platform: Platform) {
    focusPlatform(platform);
    // An empty platform has nothing to act on yet, so bring the pool with it.
    stationUi.showPlatform({ withYard: platform.train === null });
  }
</script>

<section class="station-view">
  {#if mode === 'platform' && station && activePlatform}
    <PlatformView
      {station}
      plot={activePlotState}
      plotCellId={activePlotCellId}
      platform={activePlatform}
      {now}
      onBack={() => stationUi.showDashboard()}
      onSelectPlatform={focusPlatform}
    />
  {:else}
    <StationDashboard {station} plot={activePlotState} plotCellId={activePlotCellId} {now} onOpenPlatform={handleOpenPlatform} />
  {/if}

  {#if station}
    <TrainYardDrawer {station} plot={activePlotState} targetPlatform={activePlatform} />
  {/if}
</section>

<style>
  /* `relative` is load-bearing: the yard drawer anchors to this box rather than
     the viewport, which is what keeps it clear of the nav bar — the player can
     put that at the top or the bottom. */
  .station-view {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    padding: 12px;
    overflow: hidden;
    box-sizing: border-box;
  }
</style>
