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
  import Pencil from 'lucide-svelte/icons/pencil';
  import Plus from 'lucide-svelte/icons/plus';
  import Trash2 from 'lucide-svelte/icons/trash-2';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import { de } from '$lib/i18n/de';
  import { app, bumpRevision, toast } from '$lib/state.svelte';

  let list = $state<SeriesDto[]>([]);
  let loaded = $state(false);
  let confirm = $state<{ kind: 'end' | 'delete'; series: SeriesDto } | null>(null);
  let confirmOpen = $state(false);
  let busy = $state(false);
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
    busy = true;
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
    busy = false;
    confirmOpen = false;
    confirm = null;
  }
</script>

<PageHeader label={de.series.label} title={de.series.title}>
  {#snippet actions()}
    <Button href="/neu"><Plus size={20} strokeWidth={2} aria-hidden="true" />{de.nav.newTraining}</Button>
  {/snippet}
</PageHeader>
<p class="-mt-3 mb-6 max-w-prose text-muted">{de.series.intro}</p>

{#if !loaded}
  <Skeleton rows={2} lines={3} />
{:else if list.length === 0}
  <Card>
    <EmptyState text={de.series.none}>
      {#snippet action()}<Button href="/neu">{de.nav.newTraining}</Button>{/snippet}
    </EmptyState>
  </Card>
{/if}

<ul class="grid gap-3 md:grid-cols-2">
  {#each list as s (s.id)}
    {@const ended = isEnded(s)}
    <li
      class="relative flex overflow-hidden rounded-md border-hl border-line bg-surface {ended
        ? 'opacity-75'
        : ''}"
      data-testid="series-card"
    >
      <span class="w-[var(--hl-size-stripe)] shrink-0" style:background={s.color} aria-hidden="true"></span>
      <div class="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-score text-2xl font-semibold">{[s.team, s.title].filter(Boolean).join(' · ')}</p>
            <p class="font-medium">
              {weekdayMaskToLabel(s.weekdays)} · {s.startTime}–{s.endTime} · {de.series.every(
                s.intervalWeeks,
              )}
            </p>
            <p class="text-sm text-muted">
              {[
                s.location,
                de.series.since(formatDateShortDe(s.startsOn)),
                s.endsOn ? de.series.until(formatDateShortDe(s.endsOn)) : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <p class="text-sm text-muted">{s.units} × {formatCents(s.payCents)}</p>
          </div>
          {#if ended}
            <span
              class="shrink-0 rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs font-semibold text-muted"
              >{de.series.inactive}</span
            >
          {/if}
        </div>
        <div class="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" class="min-h-12" href="/neu?series={s.id}">
            <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />{de.common.edit}</Button
          >
          {#if !ended}
            <Button
              variant="secondary"
              size="sm"
              class="min-h-12"
              onclick={() => ((confirm = { kind: 'end', series: s }), (confirmOpen = true))}
              >{de.series.end}</Button
            >
          {/if}
          <Button
            variant="ghost"
            size="sm"
            class="min-h-12 text-danger"
            onclick={() => ((confirm = { kind: 'delete', series: s }), (confirmOpen = true))}
          >
            <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />{de.common.delete}</Button
          >
        </div>
      </div>
    </li>
  {/each}
</ul>

<Dialog
  bind:open={confirmOpen}
  title={confirm?.kind === 'delete' ? de.series.deleteTitle : de.series.endTitle}
>
  <p class="mb-5">{confirm?.kind === 'delete' ? de.series.deleteConfirm : de.series.endConfirm}</p>
  <div class="flex flex-wrap gap-2">
    <Button variant="danger" class="flex-1" loading={busy} onclick={doConfirm}
      >{confirm?.kind === 'delete' ? de.common.delete : de.series.end}</Button
    >
    <Button variant="secondary" class="flex-1" onclick={() => (confirmOpen = false)}
      >{de.common.cancel}</Button
    >
  </div>
</Dialog>
