<!-- /src/components/station/StationDashboard.svelte -->
<script lang="ts">
  import PlatformRow from './PlatformRow.svelte';
  import BuildStationCta from './BuildStationCta.svelte';
  import { commit, lacksResources } from './stationHelpers.svelte';
  import { getDispatchReadyPlatforms, getShaftIndexesWithPlatforms, getStationSummary } from './stationSelectors';
  import { gameState } from '../../logic/app/gameState.svelte';
  import { worldStore } from '../../logic/world/worldStore.svelte';
  import { stationUi } from '../../logic/station/stationUi.svelte';
  import { toRoman } from '../../logic/mine/mineLabels';
  import { getPlatformsForMineshaft } from '../../logic/station/stationTypes';
  import { buildPlatform, dispatch, dispatchExplore, getActiveExploreTargets, getEligiblePlatformPositions } from '../../logic/station/stationActions';
  import { getExplorationTarget, isExplorationRoute } from '../../logic/world/worldTypes';
  import { plotsStore } from '../../logic/mine/plotsStore.svelte';
  import { getPlatformCost } from '../../logic/station/stationBalance';
  import type { EligiblePosition } from '../../logic/station/stationActions';
  import type { Platform, Station } from '../../logic/station/stationTypes';
  import type { PlotState } from '../../logic/mine/mineTypes';

  interface Props {
    station: Station | null;
    plot: PlotState | null;
    plotCellId: string | null;
    now: number;
    onOpenPlatform: (platform: Platform) => void;
  }

  const { station, plot, plotCellId, now, onOpenPlatform }: Props = $props();

  const money = $derived(gameState.current.money);
  const headerName = $derived(worldStore.activePlotCell?.name ?? 'Station');

  const summary = $derived(getStationSummary(station));
  const shaftIndexes = $derived(getShaftIndexesWithPlatforms(station));
  const platformCount = $derived(station?.platforms.length ?? 0);

  // A scout is only "ready" while a hidden tile is inspected and nobody else is
  // already on their way to it.
  const exploreTarget = $derived(getExplorationTarget(worldStore.current));
  const exploreOccupied = $derived(getActiveExploreTargets(plotsStore.current));
  const exploreTargetFree = $derived(exploreTarget !== null && !exploreOccupied.has(exploreTarget.id));

  const dispatchReady = $derived(getDispatchReadyPlatforms(station, { exploreTargetFree }));
  const eligiblePositions = $derived<EligiblePosition[]>(plot ? getEligiblePlatformPositions(plot) : []);

  // Several eligible spots collapse to the shallowest, with the rest one tap away.
  let showAllPositions = $state(false);
  const shownPositions = $derived(showAllPositions ? eligiblePositions : eligiblePositions.slice(0, 1));

  function positionCost(position: EligiblePosition) {
    return getPlatformCost(position.depth, plot?.currentAge ?? 'Mechanical');
  }

  function positionAffordable(position: EligiblePosition): boolean {
    const cost = positionCost(position);
    return money >= cost.money && !(plot ? lacksResources(cost.resources, plot.ageResources) : true);
  }

  function handleBuildPlatform(position: EligiblePosition) {
    if (!station || !plot) {
      return;
    }
    commit(buildPlatform(station, plot, position.mineshaftIndex, position.depth, gameState.current.money));
    showAllPositions = false;
  }

  /** Dispatch every train that has a route and isn't already out. */
  function handleDispatchReady() {
    if (!plot || !plotCellId) {
      return;
    }
    for (const platform of dispatchReady) {
      const train = platform.train;
      if (!train) {
        continue;
      }
      // Scouts go to the inspected fog tile; everyone else to their standing route.
      if (isExplorationRoute(train.route)) {
        if (exploreTarget) {
          commit(dispatchExplore(train, worldStore.current, exploreTarget.id, plotCellId, Date.now(), exploreOccupied));
        }
        continue;
      }
      commit(dispatch(train, plot, worldStore.current, plotCellId, Date.now()));
    }
  }
</script>

<div class="dashboard">
  <header class="head">
    <h2 class="plot-name">{headerName}</h2>
    <p class="head-sub">{platformCount} platforms · {shaftIndexes.length} shafts</p>
  </header>

  {#if !station}
    <BuildStationCta {plot} {plotCellId} />
  {:else}
    <div class="summary">
      <div class="stat">
        <span class="stat-value">{summary.idle}</span>
        <span class="stat-label">Idle</span>
      </div>
      <div class="stat">
        <span class="stat-value ok">{summary.enRoute}</span>
        <span class="stat-label">En route</span>
      </div>
      <div class="stat">
        <span class="stat-value muted">{summary.empty}</span>
        <span class="stat-label">Empty</span>
      </div>
    </div>

    <div class="list">
      {#each shaftIndexes as shaftIndex (shaftIndex)}
        <h3 class="shaft-head">Shaft <span class="roman">{toRoman(shaftIndex + 1)}</span></h3>
        {#each getPlatformsForMineshaft(station, shaftIndex) as platform (platform.id)}
          <PlatformRow
            {platform}
            {station}
            {plot}
            {plotCellId}
            {now}
            {exploreTargetFree}
            isActive={station.activePlatformId === platform.id}
            onOpen={onOpenPlatform}
          />
        {/each}
      {/each}

      {#if eligiblePositions.length > 0}
        {#each shownPositions as position (`${position.mineshaftIndex}-${position.depth}`)}
          {@const cost = positionCost(position)}
          <button type="button" class="build-row" onclick={() => handleBuildPlatform(position)} disabled={!positionAffordable(position)}>
            ＋ Build platform · {toRoman(position.mineshaftIndex + 1)} · D{position.depth} · ${cost.money}
          </button>
        {/each}
        {#if eligiblePositions.length > 1 && !showAllPositions}
          <button type="button" class="more-row" onclick={() => (showAllPositions = true)}>
            {eligiblePositions.length - 1} more spot{eligiblePositions.length - 1 === 1 ? '' : 's'} available
          </button>
        {/if}
      {/if}

      {#if platformCount === 0 && eligiblePositions.length === 0}
        <p class="empty-note">No platforms yet. Hard-clear a level on the platform grid (depth 0, 6, 11, 16, …) to build one.</p>
      {/if}
    </div>

    <footer class="foot">
      <button type="button" class="btn-secondary" onclick={() => stationUi.openYard('peek')}>🚂 Yard ▴</button>
      <button type="button" class="btn-primary" onclick={handleDispatchReady} disabled={dispatchReady.length === 0}>
        Dispatch ready · {dispatchReady.length}
      </button>
    </footer>
  {/if}
</div>

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    min-height: 0;
  }

  .head {
    flex-shrink: 0;
  }

  .plot-name {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
  }

  .head-sub {
    margin: 2px 0 0;
    font-size: 12px;
    color: var(--mcc-text-muted);
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    flex-shrink: 0;
    padding: 12px;
    border-radius: 14px;
    background: var(--mcc-panel);
    border: 1px solid var(--mcc-border);
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 800;
    line-height: 1;
  }

  .stat-value.ok {
    color: var(--success);
  }

  .stat-value.muted {
    color: var(--mcc-text-muted);
  }

  .stat-label {
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--mcc-text-muted);
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .shaft-head {
    margin: 6px 0 0;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--mcc-text-muted);
  }

  .build-row {
    min-height: 44px;
    padding: 12px;
    font-size: 12px;
    font-weight: 700;
    color: var(--mcc-text-main);
    background: transparent;
    border: 1px dashed var(--mcc-border);
    border-radius: 12px;
    cursor: pointer;
  }

  .build-row:hover:not(:disabled) {
    border-color: var(--mcc-accent);
    color: var(--mcc-accent);
  }

  .build-row:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .more-row {
    padding: 6px;
    font-size: 11px;
    color: var(--mcc-text-muted);
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: underline;
  }

  .empty-note {
    margin: 0;
    font-size: 12px;
    color: var(--mcc-text-muted);
  }

  .foot {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .btn-secondary,
  .btn-primary {
    min-height: 44px;
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 700;
    border-radius: 12px;
    cursor: pointer;
    border: 1px solid var(--mcc-border);
  }

  .btn-secondary {
    background: var(--mcc-surface-2);
    color: var(--mcc-text-main);
  }

  .btn-primary {
    flex: 1;
    background: linear-gradient(180deg, var(--mcc-green-top), var(--mcc-green-bot));
    border-color: var(--mcc-green-edge);
    color: #ffffff;
  }

  .btn-secondary:hover,
  .btn-primary:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  .btn-primary:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
