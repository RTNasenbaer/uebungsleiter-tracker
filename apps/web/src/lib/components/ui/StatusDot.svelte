<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Calendar status dot: form differs per status (DESIGN.md §2), so color is never the only signal. -->
<script lang="ts">
  import type { SessionStatus } from '@ult/shared';
  let { status }: { status: SessionStatus } = $props();
</script>

{#if status === 'held'}
  <span class="block size-2.5 rounded-full bg-held"></span>
{:else if status === 'not_held'}
  <span class="relative block size-2.5 rounded-full bg-not-held">
    <span class="absolute top-1/2 -left-0.5 h-[1.5px] w-3.5 -translate-y-1/2 -rotate-45 bg-surface"></span>
  </span>
{:else if status === 'pending'}
  <span class="block size-3 rounded-full border-2 border-fg bg-pending"></span>
{:else if status === 'planned'}
  <span class="block size-2.5 rounded-full border-2 border-planned"></span>
{:else}
  <span class="block h-[2px] w-2.5 rounded-full bg-cancelled"></span>
{/if}
