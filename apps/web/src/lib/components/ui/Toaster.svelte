<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Toasts (DESIGN.md §8): bottom centre, above the mobile navigation, polite live region, optional undo. -->
<script lang="ts">
  import CircleAlert from 'lucide-svelte/icons/circle-alert';
  import CircleCheck from 'lucide-svelte/icons/circle-check';
  import { dismissToast, toasts } from '$lib/state.svelte';
</script>

<div
  class="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
  aria-live="polite"
  role="status"
>
  {#each toasts as t (t.id)}
    <div
      class="pointer-events-auto flex max-w-md min-w-0 animate-rise items-center gap-3 rounded-md bg-scoreboard py-2 pr-2 pl-4 text-on-scoreboard shadow-float"
      data-kind={t.kind}
    >
      {#if t.kind === 'error'}
        <CircleAlert size={20} strokeWidth={1.75} aria-hidden="true" class="shrink-0 text-on-scoreboard" />
      {:else}
        <CircleCheck size={20} strokeWidth={1.75} aria-hidden="true" class="shrink-0 text-progress" />
      {/if}
      <span class="min-w-0 flex-1 py-1.5 font-medium">{t.text}</span>
      {#if t.action}
        <button
          type="button"
          class="min-h-10 shrink-0 cursor-pointer rounded-sm px-3 font-semibold text-progress underline-offset-4 hover:underline"
          onclick={() => {
            t.action?.run();
            dismissToast(t.id);
          }}>{t.action.label}</button
        >
      {/if}
    </div>
  {/each}
</div>
