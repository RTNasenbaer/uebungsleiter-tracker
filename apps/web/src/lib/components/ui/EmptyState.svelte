<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Empty state: court outline + one sentence + one action. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import FieldLines from '../brand/FieldLines.svelte';

  let { text, action, testid }: { text: string; action?: Snippet; testid?: string } = $props();
</script>

<div class="flex flex-col items-center gap-4 px-4 py-8 text-center" data-testid={testid}>
  <FieldLines class="h-16 w-32 text-line" />
  <p class="max-w-sm text-lg font-medium text-balance">{text}</p>
  {#if action}{@render action()}{/if}
</div>
