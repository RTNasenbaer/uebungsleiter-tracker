<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Ballnaht (DESIGN.md §5): three curved seams, own drawing. Used for logo, FAB, loader and empty states. -->
<script lang="ts">
  let {
    size = 24,
    strokeWidth = 1.75,
    outline = true,
    class: klass = '',
  }: { size?: number | string; strokeWidth?: number; outline?: boolean; class?: string } = $props();
</script>

<svg
  class={klass}
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={strokeWidth}
  stroke-linecap="round"
  aria-hidden="true"
  focusable="false"
>
  {#if outline}<circle cx="12" cy="12" r="10" />{/if}
  {#each [0, 120, 240] as angle (angle)}
    <path d="M12 12c0-4.4 2.6-7.2 6.9-7.1" transform="rotate({angle} 12 12)" />
  {/each}
</svg>
