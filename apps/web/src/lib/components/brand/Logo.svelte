<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Ball logo (DESIGN.md §13): seams in navy on a ball-yellow circle. `mono` = outline only (no second yellow element). -->
<script lang="ts">
  let {
    size = 40,
    mono = false,
    class: klass = '',
  }: { size?: number; mono?: boolean; class?: string } = $props();
</script>

<svg
  class={klass}
  width={size}
  height={size}
  viewBox="0 0 24 24"
  aria-hidden="true"
  focusable="false"
  stroke-linecap="round"
  fill="none"
>
  <circle
    cx="12"
    cy="12"
    r="10.25"
    class={mono ? 'stroke-current' : 'fill-accent stroke-focus-inner'}
    stroke-width="1.5"
  />
  {#each [0, 120, 240] as angle (angle)}
    <path
      d="M12 12c0-4.4 2.6-7.2 6.9-7.1"
      transform="rotate({angle} 12 12)"
      class={mono ? 'stroke-current' : 'stroke-focus-inner'}
      stroke-width="1.6"
    />
  {/each}
</svg>
