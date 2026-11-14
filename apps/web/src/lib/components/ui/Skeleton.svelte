<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Skeleton in the shape of the later content (no spinner for lists). -->
<script lang="ts">
  import { de } from '$lib/i18n/de';
  let {
    lines = 2,
    rows = 3,
    label = de.common.loading,
  }: { lines?: number; rows?: number; label?: string } = $props();
</script>

<div role="status" aria-label={label} class="flex flex-col gap-3">
  {#each Array(rows) as _, r (r)}
    <div
      class="flex animate-skeleton flex-col gap-2 rounded-md border-hl border-line bg-surface p-4"
      aria-hidden="true"
    >
      <div class="h-5 w-2/5 rounded-sm bg-surface-sunken"></div>
      {#each Array(lines - 1) as _, i (i)}
        <div class="h-4 w-3/4 rounded-sm bg-surface-sunken"></div>
      {/each}
    </div>
  {/each}
</div>
