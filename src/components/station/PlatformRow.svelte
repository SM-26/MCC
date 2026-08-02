<!-- /src/components/station/PlatformRow.svelte -->
<script lang="ts">
  import TrainConsist from './TrainConsist.svelte';
  import { formatCountdown, isDispatchable } from './stationSelectors';
  import { tripPreview } from './stationHelpers.svelte';
  import { worldStore } from '../../logic/world/worldStore.svelte';
  import { isExplorationRoute } from '../../logic/world/worldTypes';
  import { getPlatformDisplayName, getTripRemainingMs } from '../../logic/station/stationTypes';
  import type { Platform, Station } from '../../logic/station/stationTypes';
  import type { PlotState } from '../../logic/mine/mineTypes';

  interface Props {
    platform: Platform;
    station: Station;
    plot: PlotState | null;
    plotCellId: string | null;
    isActive: boolean;
    /** Ticking clock from the shell; countdowns re-render off this. */
    now: number;
    /** Whether a scout has anywhere to go, see isDispatchable. */
    exploreTargetFree?: boolean;
    onOpen: (platform: Platform) => void;
  }

  const { platform, station, plot, plotCellId, isActive, now, exploreTargetFree = false, onOpen }: Props = $props();

  const train = $derived(platform.train);
  const trip = $derived(train?.trip ?? null);

  const title = $derived(train ? `${train.engineAge} · Lv ${train.engineLevel}` : getPlatformDisplayName(station, platform));

  const preview = $derived(train && train.route ? tripPreview(train, plot, plotCellId) : null);
  const destinationName = $derived(worldStore.destinations.find((d) => d.id === train?.route?.destinationId)?.name ?? null);

  // "Ready" means dispatchable *now*. A scout with no hidden tile inspected has
  // a route but nowhere to go, so it reads Idle rather than promising a trip.
  type Tone = 'empty' | 'idle' | 'ready' | 'out';
  const tone = $derived<Tone>(!train ? 'empty' : trip ? 'out' : isDispatchable(train, exploreTargetFree) ? 'ready' : 'idle');

  const statusLabel = $derived(
    tone === 'out' && trip ? formatCountdown(getTripRemainingMs(trip, now)) : tone === 'ready' ? 'Ready' : tone === 'idle' ? 'Idle' : 'Empty',
  );

  // Elapsed fraction of the round trip, clamped so a late tick can't overflow the bar.
  const progressPercent = $derived(trip ? Math.min(100, Math.max(0, (1 - getTripRemainingMs(trip, now) / trip.durationMs) * 100)) : 0);

  const subLine = $derived.by(() => {
    if (!train) return 'No train. Tap to assign one from the yard.';
    if (isExplorationRoute(train.route)) {
      return exploreTargetFree ? '→ Exploring · ready to reveal the inspected tile' : '→ Exploration · inspect a hidden tile in the World map';
    }
    if (train.route && destinationName) {
      return `→ ${destinationName}${preview ? ` · pays ${preview.reward}` : ''}`;
    }
    return '';
  });
</script>

<button type="button" class="row" class:is-ready={tone === 'ready'} onclick={() => onOpen(platform)}>
  <span class="badge" class:gold={isActive}>
    <span class="badge-num">{platform.depth}</span>
    <span class="badge-label">{platform.depth === 0 ? 'main' : 'depth'}</span>
  </span>

  <span class="body">
    <span class="title-line">
      <span class="title">{title}</span>
      {#if train}
        <TrainConsist {train} scale={1} />
      {/if}
    </span>
    {#if subLine}
      <span class="sub">{subLine}</span>
    {/if}
  </span>

  <span class="status">
    <span class="pill tone-{tone}">
      {#if tone === 'out'}
        <span class="dot" aria-hidden="true"></span>
      {/if}
      {statusLabel}
    </span>
    {#if trip}
      <span class="meter" aria-hidden="true"><span class="meter-fill" style="width: {progressPercent}%"></span></span>
    {/if}
  </span>

  <span class="chevron" aria-hidden="true">›</span>
</button>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    text-align: left;
    background: var(--mcc-panel);
    border: 1px solid var(--mcc-border);
    border-radius: 12px;
    cursor: pointer;
    color: var(--mcc-text-main);
  }

  /* The one actionable row on the screen gets the gold ring so it pops. */
  .row.is-ready {
    border-color: var(--mcc-accent);
    box-shadow: 0 0 0 1px var(--mcc-accent) inset;
  }

  .row:hover {
    background: var(--mcc-surface-2);
  }

  .badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 40px;
    padding: 4px 0;
    border-radius: 9px;
    background: var(--mcc-surface-2);
    border: 1px solid var(--mcc-border);
  }

  .badge.gold {
    background: var(--mcc-accent);
    border-color: var(--mcc-accent);
    color: #1a1a1a;
  }

  .badge-num {
    font-size: 15px;
    font-weight: 800;
    line-height: 1;
  }

  .badge-label {
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.75;
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
  }

  .title-line {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .title {
    font-weight: 700;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sub {
    font-size: 11px;
    color: var(--mcc-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .status {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 4px 8px;
    border-radius: 999px;
    border: 1px solid var(--mcc-border);
  }

  .tone-ready {
    color: var(--mcc-accent);
    border-color: var(--mcc-accent);
  }

  .tone-out {
    color: var(--success);
    border-color: var(--success);
  }

  .tone-idle,
  .tone-empty {
    color: var(--mcc-text-muted);
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--success);
    animation: pulse 1.4s ease-in-out infinite;
  }

  .meter {
    display: block;
    width: 56px;
    height: 3px;
    border-radius: 999px;
    background: var(--mcc-hp-bg);
    overflow: hidden;
  }

  .meter-fill {
    display: block;
    height: 100%;
    background: var(--success);
    transition: width 1s linear;
  }

  .chevron {
    flex-shrink: 0;
    color: var(--mcc-text-muted);
    font-size: 18px;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dot {
      animation: none;
    }
    .meter-fill {
      transition: none;
    }
  }
</style>
