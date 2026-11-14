<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import {
    MONTHS_DE,
    WEEKDAY_LABELS,
    addDays,
    formatDateDe,
    formatDateLongDe,
    lastDayOfMonth,
    mondayOf,
    systemClock,
    todayIn,
    type ExceptionDto,
    type SessionDto,
    type SessionStatus,
  } from '@ult/shared';
  import ChevronLeft from 'lucide-svelte/icons/chevron-left';
  import ChevronRight from 'lucide-svelte/icons/chevron-right';
  import { api } from '$lib/api';
  import SessionEditor from '$lib/components/SessionEditor.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import IconButton from '$lib/components/ui/IconButton.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
  import SessionCard from '$lib/components/ui/SessionCard.svelte';
  import StatusDot from '$lib/components/ui/StatusDot.svelte';
  import { afterDialogClosed } from '$lib/components/ui/history';
  import { de } from '$lib/i18n/de';
  import { app } from '$lib/state.svelte';

  const today = todayIn(systemClock);
  const desktop = new MediaQuery('min-width: 1024px');
  let ym = $state({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) });
  let sessions = $state<SessionDto[]>([]);
  let exceptions = $state<ExceptionDto[]>([]);
  let selectedDay = $state<string | null>(today);
  let sheetOpen = $state(false);
  let view = $state<'month' | 'list'>('month');
  let editing = $state<SessionDto | null>(null);

  const first = $derived(`${ym.y}-${String(ym.m).padStart(2, '0')}-01`);
  const last = $derived(lastDayOfMonth(ym.y, ym.m));
  const monthTitle = $derived(`${MONTHS_DE[ym.m - 1]} ${ym.y}`);
  const gridDays = $derived.by(() => {
    const start = mondayOf(first);
    const days: string[] = [];
    for (let d = start; d <= last || days.length % 7 !== 0; d = addDays(d, 1)) days.push(d);
    return days;
  });
  const byDay = $derived(
    sessions.reduce<Record<string, SessionDto[]>>((acc, s) => {
      (acc[s.date] ??= []).push(s);
      return acc;
    }, {}),
  );
  const daySessions = $derived(selectedDay ? (byDay[selectedDay] ?? []) : []);
  const listDays = $derived(Object.keys(byDay).sort());
  const closedOn = (d: string) =>
    exceptions.find((e) => !e.seriesId && e.fromDate <= d && e.toDate >= d)?.label ?? null;

  $effect(() => {
    void app.revision;
    api.sessions(first, last).then((s) => (sessions = s));
  });
  $effect(() => {
    void app.revision;
    api
      .exceptions()
      .then((e) => (exceptions = e))
      .catch(() => {});
  });

  function shift(delta: number) {
    const m0 = ym.m - 1 + delta;
    ym = { y: ym.y + Math.floor(m0 / 12), m: (((m0 % 12) + 12) % 12) + 1 };
    selectedDay = null;
  }

  function pick(d: string) {
    selectedDay = d;
    if (!desktop.current) sheetOpen = true;
  }

  const LEGEND: SessionStatus[] = ['held', 'not_held', 'pending', 'planned', 'cancelled'];
</script>

<PageHeader label={monthTitle} title={de.calendar.title}>
  {#snippet actions()}
    <div class="flex items-center gap-1">
      <IconButton icon={ChevronLeft} label={de.calendar.prev} variant="secondary" onclick={() => shift(-1)} />
      <Button
        variant="ghost"
        onclick={() => {
          ym = { y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) };
          selectedDay = today;
        }}>{de.calendar.today}</Button
      >
      <IconButton icon={ChevronRight} label={de.calendar.next} variant="secondary" onclick={() => shift(1)} />
    </div>
  {/snippet}
</PageHeader>

<p class="sr-only" aria-live="polite">{monthTitle}</p>

<div class="mb-4 md:hidden">
  <SegmentedControl
    legend={de.calendar.view}
    hideLegend
    bind:value={view}
    options={[
      { value: 'month', label: de.calendar.month },
      { value: 'list', label: de.calendar.list },
    ]}
  />
</div>

<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
  <div class={view === 'list' ? 'hidden md:block' : ''}>
    <Card padded={false} class="overflow-hidden">
      <div class="grid grid-cols-7 border-b-hl border-line bg-surface-sunken" aria-hidden="true">
        {#each WEEKDAY_LABELS as w (w)}
          <div class="py-2 text-center label-caps">{w}</div>
        {/each}
      </div>
      <div class="grid grid-cols-7" role="group" aria-label={monthTitle}>
        {#each gridDays as d, i (d)}
          {@const inMonth = d >= first && d <= last}
          {@const list = byDay[d] ?? []}
          {@const closed = closedOn(d)}
          <button
            type="button"
            class="relative flex min-h-16 cursor-pointer flex-col items-center gap-1.5 p-1.5 text-sm transition-press hover:bg-surface-sunken md:min-h-24 md:items-start md:p-2 {i %
              7 !==
            6
              ? 'border-r-hl'
              : ''} {i < gridDays.length - 7 ? 'border-b-hl' : ''} border-line {inMonth
              ? ''
              : 'text-muted'} {selectedDay === d ? 'bg-surface-sunken' : ''} {closed ? 'bg-hatch' : ''}"
            aria-pressed={selectedDay === d}
            aria-label="{formatDateDe(d)}, {de.calendar.sessionsCount(list.length)}{closed
              ? `, ${closed}`
              : ''}"
            onclick={() => pick(d)}
          >
            {#if selectedDay === d}
              <span class="absolute inset-0 border-2 border-primary" aria-hidden="true"></span>
            {/if}
            <span
              class="inline-flex size-7 items-center justify-center rounded-full font-score text-lg font-semibold {d ===
              today
                ? 'ring-[3px] ring-accent'
                : ''}">{Number(d.slice(8))}</span
            >
            <span class="flex flex-wrap items-center justify-center gap-1" aria-hidden="true">
              {#each list.slice(0, 3) as s (s.id)}<StatusDot status={s.status} />{/each}
              {#if list.length > 3}<span class="text-xs font-semibold text-muted">+{list.length - 3}</span
                >{/if}
            </span>
            <span class="hidden w-full truncate text-left text-xs text-muted md:block" aria-hidden="true">
              {list.map((s) => s.team || s.title).join(', ')}
            </span>
          </button>
        {/each}
      </div>
    </Card>
    <ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted" aria-label={de.calendar.legend}>
      {#each LEGEND as st (st)}
        <li class="flex items-center gap-1.5"><StatusDot status={st} />{de.status[st]}</li>
      {/each}
      <li class="flex items-center gap-1.5">
        <span class="block size-3 border border-line bg-hatch-strong"></span>{de.calendar.closed}
      </li>
    </ul>
  </div>

  <!-- list view (phones) -->
  {#if view === 'list'}
    <div class="flex flex-col gap-6 md:hidden">
      {#if listDays.length === 0}<p class="text-muted">{de.calendar.noSessionsMonth}</p>{/if}
      {#each listDays as d (d)}
        <section aria-labelledby="day-{d}">
          <SectionHeader id="day-{d}" title={formatDateDe(d)} />
          <div class="flex flex-col gap-2">
            {#each byDay[d] ?? [] as s (s.id)}<SessionCard session={s} onopen={() => (editing = s)} />{/each}
          </div>
        </section>
      {/each}
    </div>
  {/if}

  <!-- side panel (desktop) -->
  {#if desktop.current}
    <aside aria-live="polite">
      {#if selectedDay}
        <SectionHeader title={formatDateLongDe(selectedDay)} />
        {#if daySessions.length === 0}
          <p class="text-muted">{de.calendar.noSessions}</p>
        {:else}
          <div class="flex flex-col gap-2">
            {#each daySessions as s (s.id)}<SessionCard session={s} onopen={() => (editing = s)} />{/each}
          </div>
        {/if}
      {:else}
        <p class="text-muted">{de.calendar.pickDay}</p>
      {/if}
    </aside>
  {/if}
</div>

{#if !desktop.current && selectedDay}
  <Dialog bind:open={sheetOpen} title={formatDateLongDe(selectedDay)} label={de.calendar.title}>
    {#if daySessions.length === 0}
      <p class="text-muted">{de.calendar.noSessions}</p>
    {:else}
      <div class="flex flex-col gap-2">
        {#each daySessions as s (s.id)}
          <SessionCard
            session={s}
            onopen={async () => {
              sheetOpen = false;
              await afterDialogClosed();
              editing = s;
            }}
          />
        {/each}
      </div>
    {/if}
  </Dialog>
{/if}

<SessionEditor bind:session={editing} />
