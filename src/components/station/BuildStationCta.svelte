<!-- /src/components/station/BuildStationCta.svelte -->
<script lang="ts">
  import { Button } from 'bits-ui';
  import { commit } from './stationHelpers.svelte';
  import { gameState } from '../../logic/app/gameState.svelte';
  import { STATION_COST, buildStation, canBuildStation } from '../../logic/station/stationActions';
  import type { PlotState } from '../../logic/mine/mineTypes';

  interface Props {
    plot: PlotState | null;
    plotCellId: string | null;
  }

  const { plot, plotCellId }: Props = $props();

  const money = $derived(gameState.current.money);
  const check = $derived(plot ? canBuildStation(plot, money) : { ok: false, message: 'No active plot' });
  const canAfford = $derived(money >= STATION_COST);

  function handleBuildStation() {
    if (!plot || !plotCellId) {
      return;
    }
    commit(buildStation(plot, gameState.current.money, plotCellId));
  }
</script>

<!-- Copy and the requirement list are carried over verbatim from the old view;
     only the framing around them changed. -->
<div class="cta-card">
  <h3>Build a Station</h3>
  <p class="muted">A station is the hub for every platform and train on this plot. Build it on a hard-cleared surface level (depth 0).</p>
  <ul class="cta-reqs">
    <li class={canAfford ? 'met' : 'unmet'}>Cost: {STATION_COST} money</li>
    <li class={check.ok || !canAfford ? 'met' : 'unmet'}>Surface level (depth 0) hard-cleared</li>
  </ul>
  <Button.Root class="buy-btn" onclick={handleBuildStation} disabled={!check.ok}>
    Build Station · {STATION_COST}
  </Button.Root>
</div>

<style>
  .cta-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    border-radius: 14px;
    background: var(--mcc-panel);
    border: 1px solid var(--mcc-border);
  }

  .cta-card h3 {
    margin: 0;
    font-size: 18px;
  }

  .muted {
    margin: 0;
    font-size: 13px;
    color: var(--mcc-text-muted);
  }

  .cta-reqs {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 13px;
  }

  .cta-reqs li::before {
    content: '• ';
    font-weight: 800;
  }

  .met {
    color: var(--mcc-text-main);
  }

  .unmet {
    color: var(--mcc-text-muted);
  }
</style>
