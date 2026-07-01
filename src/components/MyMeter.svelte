<script lang="ts">
  import { Meter } from 'bits-ui';
  import type { ClearStatus } from '../logic/mine/mineGen';

  type Status = 'none' | 'soft' | 'hard';
  const {
    value = 0,
    max = 100,
    status = 'none',
  } = $props<{
    value?: number;
    max?: number;
    status?: ClearStatus;
  }>();

  const statusColors: Record<Status, string> = {
    none: '#f0c507',
    soft: '#e1891d',
    hard: '#22c55e',
  };
</script>

<Meter.Root {value} {max} class="meter-root">
  <div class="meter-fill" style="width: {(value / max) * 100}%; background-color: {statusColors[status as Status]};"></div>
</Meter.Root>

<style>
  :global(.meter-root) {
    display: block !important;
    height: 11px !important;
    width: 100% !important;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 999px;
    overflow: hidden;
    flex-shrink: 0;
    box-shadow:
      inset 0 2px 3px rgba(0, 0, 0, 0.45),
      inset 0 -1px 0 rgba(255, 255, 255, 0.06);
  }

  .meter-fill {
    height: 100% !important;
    border-radius: 999px;
    /* Glossy top highlight over whatever status colour the component sets */
    background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.05) 55%, rgba(0, 0, 0, 0.12));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
    transition:
      background-color 0.3s ease,
      width 0.3s ease;
  }
</style>
