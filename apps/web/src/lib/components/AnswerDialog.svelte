<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- In-app question (§4.4): polls every minute while the page is visible. -->
<script lang="ts">
  import { formatDateDe, type SessionDto } from '@ult/shared';
  import { api } from '$lib/api';
  import { de } from '$lib/i18n/de';
  import { bumpRevision, toast } from '$lib/state.svelte';
  import Modal from './Modal.svelte';

  const POLL_MS = 60_000;
  const SNOOZE_MIN = 30;

  let due = $state<SessionDto[]>([]);
  let open = $state(false);
  let note = $state('');
  let busy = $state(false);
  const current = $derived(due[0]);

  async function poll() {
    if (document.visibilityState !== 'visible' || busy) return;
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
    busy = true;
    try {
      await api.answer(current.occurrenceKey, status, note.trim() || null);
      toast(de.answer.done);
      next();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      busy = false;
    }
  }

  async function later() {
    if (!current) return;
    busy = true;
    try {
      await api.snooze(current.occurrenceKey, SNOOZE_MIN);
      next();
    } finally {
      busy = false;
    }
  }

  function next() {
    note = '';
    due = due.slice(1);
    open = due.length > 0;
    bumpRevision();
  }
</script>

{#if current}
  <Modal bind:open title={de.answer.question} dismissible={false}>
    <div data-testid="answer-dialog">
      <p class="text-xl font-bold">{[current.team, current.title].filter(Boolean).join(' ')}</p>
      <p class="mb-4 text-ink-muted">
        {formatDateDe(current.date)} · {current.startTime}–{current.endTime}{current.location
          ? ` · ${current.location}`
          : ''}
      </p>
      <div class="flex flex-col gap-3">
        <button class="btn-success min-h-16 text-lg" disabled={busy} onclick={() => answer('held')}
          >{de.answer.held}</button
        >
        <button class="btn-danger min-h-16 text-lg" disabled={busy} onclick={() => answer('not_held')}
          >{de.answer.notHeld}</button
        >
        <button class="btn-secondary" disabled={busy} onclick={later}>{de.answer.later}</button>
      </div>
      <label class="mt-4 block">
        <span class="label">{de.answer.note}</span>
        <input class="input" bind:value={note} maxlength="500" />
      </label>
    </div>
  </Modal>
{/if}
