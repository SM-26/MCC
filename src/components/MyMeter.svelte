<script lang="ts">
  import { Meter } from 'bits-ui';

  type Status = 'none' | 'soft' | 'hard';
  let {
    value = 0,
    max = 100,
    status = 'none',
  } = $props<{
    value?: number;
    max?: number;
    status?: Status;
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
    height: 8px !important;
    width: 100% !important;
    background: #404040;
    border-radius: 999px;
    overflow: hidden;
    flex-shrink: 0;
  }
  .meter-fill {
    height: 100% !important;
    transition:
      background-color 0.3s ease,
      width 0.3s ease;
  }
</style>
