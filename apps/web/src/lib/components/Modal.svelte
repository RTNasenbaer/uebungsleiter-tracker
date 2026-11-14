<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { de } from '$lib/i18n/de';

  let {
    open = $bindable(false),
    title,
    children,
    onclose,
    dismissible = true,
  }: {
    open: boolean;
    title: string;
    children: Snippet;
    onclose?: () => void;
    dismissible?: boolean;
  } = $props();

  let dialog: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  });

  function close() {
    open = false;
    onclose?.();
  }
</script>

<dialog
  bind:this={dialog}
  class="m-auto w-[min(32rem,calc(100vw-1.5rem))] rounded-card bg-surface p-0 text-ink shadow-xl backdrop:bg-black/50"
  aria-label={title}
  oncancel={(e) => {
    if (!dismissible) e.preventDefault();
    else close();
  }}
>
  <div class="flex items-center justify-between border-b border-line px-4 py-3">
    <h2 class="text-lg font-semibold">{title}</h2>
    {#if dismissible}
      <button class="btn min-w-touch px-2 text-xl" aria-label={de.common.close} onclick={close}>×</button>
    {/if}
  </div>
  <div class="max-h-[75vh] overflow-y-auto p-4">
    {@render children()}
  </div>
</dialog>
