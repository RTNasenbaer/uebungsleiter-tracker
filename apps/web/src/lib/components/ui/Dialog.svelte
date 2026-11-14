<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!--
  Dialog / BottomSheet (DESIGN.md §8): native <dialog> (focus trap + Esc), bottom sheet with drag handle below 768 px,
  centred dialog above. The browser/Android back gesture closes it (shallow history entry).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import X from 'lucide-svelte/icons/x';
  import { pushState } from '$app/navigation';
  import { page } from '$app/state';
  import { de } from '$lib/i18n/de';
  import IconButton from './IconButton.svelte';

  let {
    open = $bindable(false),
    title,
    label,
    children,
    footer,
    onclose,
    dismissible = true,
    size = 'md',
    header = true,
    testid,
    tone = 'default',
  }: {
    open: boolean;
    title: string;
    /** optional small caps label above the title */
    label?: string;
    children: Snippet;
    footer?: Snippet;
    onclose?: () => void;
    dismissible?: boolean;
    size?: 'md' | 'lg';
    header?: boolean;
    testid?: string;
    /** `alarm`: dark scoreboard look in both themes (in-app question) */
    tone?: 'default' | 'alarm';
  } = $props();

  const uid = $props.id();
  let dialog: HTMLDialogElement | undefined = $state();
  let dragY = $state(0);
  let dragStart: number | null = null;
  let pushed = false;

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dragY = 0;
      if (dismissible) {
        pushState('', { ...page.state, dialog: uid });
        pushed = true;
      }
    }
    if (!open && dialog.open) {
      dialog.close();
      // closed from outside (e.g. after saving): drop our history entry again
      if (pushed) {
        pushed = false;
        history.back();
      }
    }
  });

  // back gesture / browser back while open → close
  $effect(() => {
    const state = page.state as { dialog?: string };
    if (pushed && open && state.dialog !== uid) {
      pushed = false;
      close(false);
    }
  });

  function close(viaUi = true) {
    if (!open) return;
    open = false;
    if (viaUi && pushed) {
      pushed = false;
      history.back();
    }
    onclose?.();
  }

  function onpointerdown(e: PointerEvent) {
    if (!dismissible) return;
    dragStart = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onpointermove(e: PointerEvent) {
    if (dragStart !== null) dragY = Math.max(0, e.clientY - dragStart);
  }
  function onpointerup() {
    if (dragStart === null) return;
    dragStart = null;
    if (dragY > 96) close();
    dragY = 0;
  }
</script>

<dialog
  bind:this={dialog}
  class:hl-dialog--alarm={tone === 'alarm'}
  class="hl-dialog"
  style:--dialog-w={size === 'lg' ? '44rem' : '32rem'}
  style:--drag="{dragY}px"
  aria-labelledby="{uid}-title"
  data-testid={testid}
  oncancel={(e) => {
    e.preventDefault();
    if (dismissible) close();
  }}
  onclick={(e) => {
    // click on the backdrop
    if (dismissible && e.target === dialog) close();
  }}
>
  <div class="flex max-h-[inherit] flex-col">
    <!-- drag handle (mobile) -->
    <div
      class="flex h-6 shrink-0 touch-none items-center justify-center md:hidden {dismissible
        ? 'cursor-grab'
        : ''}"
      {onpointerdown}
      {onpointermove}
      {onpointerup}
      onpointercancel={onpointerup}
      aria-hidden="true"
    >
      <span class="h-1 w-10 rounded-full bg-line-strong opacity-50"></span>
    </div>
    {#if header}
      <div class="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 md:pt-4">
        <div class="min-w-0 pt-1">
          {#if label}<p class="label-caps mb-1">{label}</p>{/if}
          <h2 id="{uid}-title" class="font-score text-2xl font-bold">{title}</h2>
        </div>
        {#if dismissible}
          <IconButton icon={X} label={de.common.close} onclick={() => close()} class="-mr-2" />
        {/if}
      </div>
    {:else}
      <h2 id="{uid}-title" class="sr-only">{title}</h2>
    {/if}
    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
      {@render children()}
    </div>
    {#if footer}
      <div
        class="shrink-0 border-t-hl border-line bg-surface px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        {@render footer()}
      </div>
    {/if}
  </div>
</dialog>

<style>
  .hl-dialog {
    margin: auto auto 0;
    width: 100%;
    max-width: 100%;
    max-height: min(92dvh, 100%);
    padding: 0;
    border: 0;
    border-radius: var(--hl-radius-md) var(--hl-radius-md) 0 0;
    background: var(--hl-surface);
    color: var(--hl-text);
    box-shadow: var(--hl-shadow-float);
    padding-bottom: env(safe-area-inset-bottom);
    transform: translateY(var(--drag, 0));
  }
  .hl-dialog--alarm {
    background: var(--hl-alarm-bg);
    color: var(--hl-alarm-text);
    color-scheme: dark;
  }
  .hl-dialog[open] {
    animation: hl-sheet-in var(--hl-duration-slow) var(--hl-ease-standard) both;
  }
  .hl-dialog::backdrop {
    background: var(--hl-overlay);
    animation: hl-fade-in var(--hl-duration-slow) var(--hl-ease-standard) both;
  }
  @media (min-width: 768px) {
    .hl-dialog {
      margin: auto;
      width: min(var(--dialog-w, 32rem), calc(100vw - 3rem));
      max-height: min(85dvh, 100%);
      border-radius: var(--hl-radius-md);
      padding-bottom: 0;
      transform: none;
    }
    .hl-dialog[open] {
      animation-name: hl-dialog-in;
    }
  }
  @keyframes hl-sheet-in {
    from {
      transform: translateY(100%);
    }
  }
  @keyframes hl-dialog-in {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .hl-dialog[open] {
      animation: hl-fade-in var(--hl-duration-fast) linear both;
    }
  }
</style>
