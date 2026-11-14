<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!--
  In-app question (§4.4, DESIGN.md §7): same hierarchy as the native alarm, compact (56-px buttons).
  Polls every minute while the page is visible.
-->
<script lang="ts">
  import { formatDayMonthDe, type SessionDto } from '@ult/shared';
  import Check from 'lucide-svelte/icons/check';
  import { api } from '$lib/api';
  import { answerWithUndo } from '$lib/answers';
  import { de } from '$lib/i18n/de';
  import { bumpRevision, toast } from '$lib/state.svelte';
  import NetPattern from './brand/NetPattern.svelte';
  import Dialog from './ui/Dialog.svelte';
  import Spinner from './ui/Spinner.svelte';

  const POLL_MS = 60_000;
  const SNOOZE_MIN = 30;
  const CONFIRM_MS = 1200;

  let due = $state<SessionDto[]>([]);
  let open = $state(false);
  let note = $state('');
  let showNote = $state(false);
  let busy = $state<'held' | 'not_held' | 'later' | null>(null);
  let confirmed = $state(false);
  const current = $derived(due[0]);
  const label = $derived(current ? [current.team, current.title].filter(Boolean).join(' · ') : '');

  async function poll() {
    if (document.visibilityState !== 'visible' || busy || confirmed) return;
    try {
      due = await api.due();
      open = due.length > 0;
    } catch {
      /* offline or logged out – try again next minute */
    }
  }

  $effect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    const onVis = () => poll();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  });

  async function answer(status: 'held' | 'not_held') {
    if (!current) return;
    busy = status;
    try {
      await answerWithUndo(current, status, note.trim() || null);
      confirmed = true;
      setTimeout(() => {
        confirmed = false;
        next(false);
      }, CONFIRM_MS);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      busy = null;
    }
  }

  async function later() {
    if (!current) return;
    busy = 'later';
    try {
      await api.snooze(current.occurrenceKey, SNOOZE_MIN);
      next(true);
    } finally {
      busy = null;
    }
  }

  function next(refresh: boolean) {
    note = '';
    showNote = false;
    due = due.slice(1);
    open = due.length > 0;
    if (refresh) bumpRevision();
  }
</script>

{#if current}
  <Dialog bind:open title={de.answer.question} dismissible={false} header={false} tone="alarm">
    <div data-testid="answer-dialog" class="relative">
      {#if confirmed}
        <div class="flex flex-col items-center gap-4 py-12 text-center" role="status">
          <span
            class="flex size-24 animate-bounce-ball items-center justify-center rounded-full bg-alarm-accent text-alarm-on-accent"
          >
            <Check size={56} strokeWidth={2.5} aria-hidden="true" />
          </span>
          <p class="font-score text-3xl font-bold">{de.answer.done}</p>
        </div>
      {:else}
        <!-- header with the net motif -->
        <div class="relative -mx-5 -mt-1 mb-6 overflow-hidden px-5 pt-2 pb-5">
          <NetPattern class="absolute inset-0 text-alarm-text" opacity={0.06} />
          <div class="relative">
            <p class="label-caps text-alarm-muted">{label}</p>
            <p class="mt-2 font-score text-2xl font-semibold">{formatDayMonthDe(current.date)}</p>
            <p class="font-score text-[clamp(3rem,2.4rem+3vw,4rem)] font-bold">
              {current.startTime}–{current.endTime}
            </p>
            {#if current.location}<p class="mt-1 text-alarm-muted">{current.location}</p>{/if}
          </div>
        </div>
        <p class="mb-5 font-score text-3xl font-bold" aria-hidden="true">{de.answer.question}</p>
        <div class="flex flex-col gap-3">
          <button
            type="button"
            class="transition-press flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-sm bg-alarm-accent text-lg font-bold tracking-wide text-alarm-on-accent uppercase hover:opacity-90 active:scale-[.98] disabled:opacity-60"
            disabled={!!busy}
            onclick={() => answer('held')}
            >{#if busy === 'held'}<Spinner label={null} />{/if}{de.answer.held}</button
          >
          <button
            type="button"
            class="transition-press flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-sm border-2 border-alarm-text text-lg font-bold tracking-wide uppercase hover:bg-alarm-text/10 active:scale-[.98] disabled:opacity-60"
            disabled={!!busy}
            onclick={() => answer('not_held')}
            >{#if busy === 'not_held'}<Spinner label={null} />{/if}{de.answer.notHeld}</button
          >
          <button
            type="button"
            class="min-h-12 cursor-pointer rounded-sm font-semibold text-alarm-muted hover:text-alarm-text disabled:opacity-60"
            disabled={!!busy}
            onclick={later}>{de.answer.later}</button
          >
        </div>
        <div class="mt-4 border-t-hl border-scoreboard-line pt-3">
          {#if showNote}
            <label class="flex flex-col gap-1.5">
              <span class="text-sm font-semibold text-alarm-muted">{de.answer.note}</span>
              <!-- svelte-ignore a11y_autofocus -->
              <input
                class="min-h-12 rounded-sm border-hl border-alarm-muted bg-transparent px-3 text-alarm-text placeholder:text-alarm-muted"
                bind:value={note}
                maxlength="500"
                autofocus
              />
            </label>
          {:else}
            <button
              type="button"
              class="min-h-12 cursor-pointer text-sm font-semibold text-alarm-muted underline underline-offset-4 hover:text-alarm-text"
              onclick={() => (showNote = true)}>{de.answer.addNote}</button
            >
          {/if}
        </div>
        {#if due.length > 1}
          <p class="mt-2 text-sm text-alarm-muted">{de.answer.remaining(due.length - 1)}</p>
        {/if}
      {/if}
    </div>
  </Dialog>
{/if}
