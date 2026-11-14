<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Progress as a narrow "court": outline with centre line, fill from the left, value as text next to it. -->
<script lang="ts">
  let { value, max, label, valueText }: { value: number; max: number; label: string; valueText: string } =
    $props();
  const pct = $derived(max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0);
</script>

<div class="flex flex-col gap-2">
  <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
    <span class="label-caps text-scoreboard-muted">{label}</span>
    <span class="text-sm font-medium">{valueText}</span>
  </div>
  <div
    class="relative h-4 overflow-hidden rounded-[3px] border-hl border-scoreboard-muted"
    role="progressbar"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={Math.round(max)}
    aria-valuenow={Math.round(value)}
    aria-valuetext={valueText}
  >
    <div class="h-full bg-progress" style:width="{pct}%"></div>
    <!-- centre line of the court -->
    <span
      class="absolute inset-y-0 left-1/2 w-[1.5px] -translate-x-1/2 bg-scoreboard-muted"
      aria-hidden="true"
    ></span>
  </div>
</div>
