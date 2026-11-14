<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import {
    formatCents,
    formatDateShortDe,
    systemClock,
    todayIn,
    weekdayMaskToLabel,
    type SeriesDto,
  } from '@ult/shared';
  import { api } from '$lib/api';
  import Modal from '$lib/components/Modal.svelte';
  import { de } from '$lib/i18n/de';
  import { app, bumpRevision, toast } from '$lib/state.svelte';

  let list = $state<SeriesDto[]>([]);
  let loaded = $state(false);
  let confirm = $state<{ kind: 'end' | 'delete'; series: SeriesDto } | null>(null);
  let confirmOpen = $state(false);
  const today = todayIn(systemClock);

  $effect(() => {
    void app.revision;
    api.series().then((s) => {
      list = s;
      loaded = true;
    });
  });

  const isEnded = (s: SeriesDto) => !s.active || (s.endsOn !== null && s.endsOn < today);

  async function doConfirm() {
    if (!confirm) return;
    const { kind, series } = confirm;
    try {
      if (kind === 'delete') await api.deleteSeries(series.id);
      else {
        const { id: _id, ...rest } = series;
        await api.updateSeries(
          series.id,
          { ...rest, endsOn: today < series.startsOn ? series.startsOn : today },
          'all',
        );
      }
      toast(de.common.saved);
      bumpRevision();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    confirmOpen = false;
    confirm = null;
  }
</script>

<div class="mb-4 flex items-center justify-between gap-3">
  <h1 class="h1 mb-0">{de.series.title}</h1>
  <a href="/neu" class="btn-primary">{de.nav.new}</a>
</div>
<p class="mb-4 text-ink-muted">{de.series.intro}</p>

{#if loaded && list.length === 0}
  <p class="card text-ink-muted">{de.series.none}</p>
{/if}

<ul class="grid gap-3 md:grid-cols-2">
  {#each list as s (s.id)}
    <li class="card border-l-8" style="border-left-color: {s.color}" data-testid="series-card">
      <div class="flex items-start justify-between gap-2">
        <div>
          <p class="text-lg font-semibold">{[s.team, s.title].filter(Boolean).join(' · ')}</p>
          <p>
            {weekdayMaskToLabel(s.weekdays)} · {s.startTime}–{s.endTime} · {de.series.every(s.intervalWeeks)}
          </p>
          <p class="text-sm text-ink-muted">
            {s.location}{s.location ? ' · ' : ''}{de.series.since(formatDateShortDe(s.startsOn))}{s.endsOn
              ? ` · ${de.series.until(formatDateShortDe(s.endsOn))}`
              : ''}
          </p>
          <p class="text-sm text-ink-muted">{s.units} × {formatCents(s.payCents)}</p>
        </div>
        {#if isEnded(s)}<span class="rounded-full bg-surface-muted px-2 text-xs">{de.series.inactive}</span
          >{/if}
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <a class="btn-secondary" href="/neu?series={s.id}">{de.common.edit}</a>
        {#if !isEnded(s)}
          <button
            class="btn-secondary"
            onclick={() => ((confirm = { kind: 'end', series: s }), (confirmOpen = true))}
            >{de.series.end}</button
          >
        {/if}
        <button
          class="btn-secondary text-red-700"
          onclick={() => ((confirm = { kind: 'delete', series: s }), (confirmOpen = true))}
          >{de.common.delete}</button
        >
      </div>
    </li>
  {/each}
</ul>

<Modal bind:open={confirmOpen} title={confirm?.kind === 'delete' ? de.common.delete : de.series.end}>
  <p class="mb-4">{confirm?.kind === 'delete' ? de.series.deleteConfirm : de.series.endConfirm}</p>
  <div class="flex gap-2">
    <button class="btn-danger flex-1" onclick={doConfirm}
      >{confirm?.kind === 'delete' ? de.common.delete : de.series.end}</button
    >
    <button class="btn-secondary flex-1" onclick={() => (confirmOpen = false)}>{de.common.cancel}</button>
  </div>
</Modal>
