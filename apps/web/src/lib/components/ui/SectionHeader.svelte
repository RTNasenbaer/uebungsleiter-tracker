<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Section heading as a field-line label with the line running to the right edge. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    title,
    id,
    count,
    actions,
  }: { title: string; id?: string; count?: number | undefined; actions?: Snippet } = $props();
</script>

<div class="mb-3 flex items-center gap-3">
  <h2 {id} class="label-caps shrink-0 text-fg">
    {title}{#if count !== undefined}<span class="ml-1.5 text-muted">{count}</span>{/if}
  </h2>
  <div class="h-[var(--hl-size-line)] flex-1 bg-line" aria-hidden="true"></div>
  {#if actions}{@render actions()}{/if}
</div>
