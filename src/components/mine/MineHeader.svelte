<!-- /src/components/mine/MineHeader.svelte -->
<script lang="ts">
  import { Button } from 'bits-ui';
  import type { ClearStatus } from '../../logic/mine/mineGen';
  import MyMeter from '../MyMeter.svelte';

  const {
    shaftLabel,
    nextShaftLabel,
    depth,
    clearStatus,
    clearPercent,
    canGoPrevious = false,
    canGoNext = false,
    canBuyNextShaft = false,
    canDigDeeper = false,
    canBuyStation = false,
    onPreviousShaft,
    onNextShaft,
    onBuyNextShaft,
    onBuyStation,
    onDigDeeper,
  }: {
    shaftLabel: string;
    nextShaftLabel: string;
    depth: number;
    clearStatus: ClearStatus;
    clearPercent: number;
    canGoPrevious?: boolean;
    canGoNext?: boolean;
    canBuyNextShaft?: boolean;
    canDigDeeper?: boolean;
    canBuyStation?: boolean;
    onPreviousShaft: () => void;
    onNextShaft: () => void;
    onBuyNextShaft: () => void;
    onBuyStation: () => void;
    onDigDeeper: () => void;
  } = $props();
</script>

<header class="header">
  <div class="nav-line">
    <Button.Root class="nav-btn" onclick={onPreviousShaft} disabled={!canGoPrevious}>←</Button.Root>
    <span class="shaft-label">{shaftLabel}</span>
    <span class="shaft-sep">|</span>
    <span class="shaft-label">{nextShaftLabel}</span>
    <Button.Root class="nav-btn" onclick={onNextShaft} disabled={!canGoNext}>→</Button.Root>
  </div>

  <div class="stats">Current depth: {depth}</div>

  <MyMeter value={clearPercent} max={100} status={clearStatus} />

  <div class="actions">
    <Button.Root class="nav-btn" onclick={onBuyNextShaft} disabled={!canBuyNextShaft}>Buy next shaft</Button.Root>
    <Button.Root class="nav-btn" onclick={onDigDeeper} disabled={!canDigDeeper}>Dig deeper ↓</Button.Root>
    <Button.Root class="nav-btn" onclick={onBuyStation} disabled={!canBuyStation}>Buy station</Button.Root>
  </div>
</header>

<style>
  .header {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    padding: calc(var(--mine-padding) / 3) var(--mine-padding);
    align-self: stretch;
  }

  .nav-line {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
    font-family: monospace;
    align-self: center;
  }

  .shaft-label,
  .stats {
    color: var(--mcc-text-main);
  }

  .shaft-sep {
    opacity: 0.65;
  }

  .actions {
    display: flex;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
  }

  :global(.nav-btn) {
    min-height: 40px;
    padding: 8px 10px;
    border: 1px solid var(--mcc-border);
    border-radius: 8px;
    background: color-mix(in srgb, var(--mcc-bg-surface) 70%, white 8%);
    color: var(--mcc-text-main);
    cursor: pointer;
  }

  :global(.nav-btn:disabled),
  :global(.nav-btn[data-disabled]) {
    opacity: 0.45;
    cursor: not-allowed;
    pointer-events: none;
  }
</style>
