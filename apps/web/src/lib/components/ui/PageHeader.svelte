<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Page title: field-line label above a Barlow Condensed title (DESIGN.md §6), optional actions on the right. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  let { label, title, actions }: { label?: string | undefined; title: string; actions?: Snippet } = $props();
</script>

<header class="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
  <div class="min-w-0">
    {#if label}<p class="label-caps mb-1">{label}</p>{/if}
    <h1 class="font-score text-[clamp(1.75rem,1.5rem+1vw,2.25rem)] font-bold">{title}</h1>
  </div>
  {#if actions}<div class="flex flex-wrap gap-2">{@render actions()}</div>{/if}
</header>
