<!-- /src/components/station/PlatformScene.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import TrainConsist from './TrainConsist.svelte';
  import type { Train } from '../../logic/station/stationTypes';

  interface Props {
    train: Train | null;
    statusLabel: string;
    statusTone: 'ready' | 'idle' | 'out' | 'empty';
    /** "3 / 4 carts" — omitted on an empty platform. */
    cartLabel?: string;
    /** Planned cargo units; drives how many crates sit on the deck. */
    cargoUnits?: number;
  }

  const { train, statusLabel, statusTone, cartLabel, cargoUnits = 0 }: Props = $props();

  const enRoute = $derived(Boolean(train?.trip));

  // One crate per 10 planned units, capped at 3 — the deck is scenery, not a gauge.
  const crateCount = $derived(Math.min(3, Math.ceil(cargoUnits / 10)));

  // Departure and return are the same CSS transition run in opposite directions,
  // so no timers are involved. Suppressed until mounted, otherwise opening the
  // tab on an already-travelling train would animate it leaving all over again.
  let mounted = $state(false);
  onMount(() => {
    mounted = true;
  });
</script>

<div class="scene">
  <div class="glow" aria-hidden="true"></div>
  <div class="rail-bed" aria-hidden="true">
    <div class="ties"></div>
    <div class="rail rail-far"></div>
    <div class="rail rail-near"></div>
  </div>

  <div class="train-layer" class:animated={mounted} class:departed={enRoute}>
    <TrainConsist {train} scale={3} ghost={!train} />
  </div>

  <div class="deck" aria-hidden="true"></div>

  {#if crateCount > 0 && !enRoute}
    <div class="crates" aria-hidden="true">
      {#each { length: crateCount } as _, index (index)}
        <span class="crate">📦</span>
      {/each}
    </div>
  {/if}

  <span class="status-tag tone-{statusTone}">{statusLabel}</span>
  {#if cartLabel}
    <span class="cart-count">{cartLabel}</span>
  {/if}
</div>

<style>
  .scene {
    position: relative;
    flex: 1;
    min-height: 180px;
    border-radius: 14px;
    overflow: hidden;
    /* Recessed ground: darker at the rim, lit from the shaft above. */
    background:
      radial-gradient(120% 80% at 50% -10%, rgba(255, 255, 255, 0.06), transparent 60%),
      linear-gradient(180deg, var(--mcc-ground-1) 0%, var(--mcc-ground-2) 100%);
    border: 1px solid var(--mcc-border);
  }

  /* Light spilling down the shaft the platform is cut into. */
  .glow {
    position: absolute;
    inset: 0 0 auto 0;
    height: 45%;
    background: radial-gradient(70% 100% at 50% 0%, rgba(255, 193, 71, 0.22), transparent 70%);
    pointer-events: none;
  }

  .rail-bed {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 46px;
    height: 22px;
  }

  .ties {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.42) 0 6px, transparent 6px 16px);
    opacity: 0.75;
  }

  .rail {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.12));
  }

  .rail-far {
    top: 4px;
  }

  .rail-near {
    bottom: 2px;
  }

  .train-layer {
    position: absolute;
    left: 14px;
    bottom: 48px;
  }

  .train-layer.animated {
    transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Off to the right, the direction the rails run. */
  .train-layer.departed {
    transform: translateX(calc(100vw));
  }

  .deck {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 44px;
    background: var(--mcc-surface-2);
    border-top: 2px solid var(--mcc-border);
  }

  /* Hazard edging along the platform lip. */
  .deck::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 6px;
    background: repeating-linear-gradient(45deg, var(--mcc-accent) 0 6px, rgba(0, 0, 0, 0.55) 6px 12px);
    opacity: 0.85;
  }

  .crates {
    position: absolute;
    right: 12px;
    bottom: 8px;
    display: flex;
    gap: 2px;
    font-size: 18px;
    line-height: 1;
  }

  .status-tag,
  .cart-count {
    position: absolute;
    top: 10px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 5px 9px;
    border-radius: 999px;
    border: 1px solid var(--mcc-border);
    background: var(--mcc-panel);
  }

  .status-tag {
    left: 10px;
  }

  .cart-count {
    right: 10px;
    color: var(--mcc-text-muted);
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

  @media (prefers-reduced-motion: reduce) {
    .train-layer.animated {
      transition: none;
    }
  }
</style>
