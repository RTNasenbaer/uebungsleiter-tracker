<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Volleyball court outline (18 × 9 m, centre line, 3-m attack lines) – background motif, purely decorative. -->
<script lang="ts">
  let { class: klass = '', mark = true }: { class?: string; mark?: boolean } = $props();
</script>

<svg
  class={klass}
  viewBox="0 0 184 96"
  fill="none"
  preserveAspectRatio="xMidYMid meet"
  aria-hidden="true"
  focusable="false"
>
  <g stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke">
    <rect x="2" y="3" width="180" height="90" rx="1" />
    <line x1="62" y1="3" x2="62" y2="93" />
    <line x1="122" y1="3" x2="122" y2="93" />
  </g>
  <line x1="92" y1="0" x2="92" y2="96" class="stroke-fg" stroke-width="2" opacity="0.35" />
  {#if mark}
    <line x1="88" y1="3" x2="96" y2="3" class="stroke-court" stroke-width="2" />
    <line x1="88" y1="93" x2="96" y2="93" class="stroke-court" stroke-width="2" />
  {/if}
</svg>
