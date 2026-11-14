<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import {
    addDays,
    formatCents,
    formatDateLongDe,
    formatDayMonthDe,
    formatDeadline,
    summarize,
    systemClock,
    todayIn,
    toLocal,
    weekdayLongDe,
    type SessionDto,
    type SettingsDto,
  } from '@ult/shared';
  import FileText from 'lucide-svelte/icons/file-text';
  import MapPin from 'lucide-svelte/icons/map-pin';
  import { api } from '$lib/api';
  import { answerWithUndo } from '$lib/answers';
  import FieldLines from '$lib/components/brand/FieldLines.svelte';
  import SessionEditor from '$lib/components/SessionEditor.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import CourtProgress from '$lib/components/ui/CourtProgress.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import ScoreTile from '$lib/components/ui/ScoreTile.svelte';
  import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
  import SessionCard from '$lib/components/ui/SessionCard.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import { de } from '$lib/i18n/de';
  import { app, toast } from '$lib/state.svelte';

  const OPEN_PREVIEW = 4;
  let sessions = $state<SessionDto[]>([]);
  let open = $state<SessionDto[]>([]);
  let settings = $state<SettingsDto | null>(null);
  let editing = $state<SessionDto | null>(null);
  let loaded = $state(false);
  let answering = $state<string | null>(null);

  const today = $derived(todayIn(systemClock));
  const year = $derived(Number(today.slice(0, 4)));
  const month = $derived(summarize(sessions, `${today.slice(0, 7)}-01`, `${today.slice(0, 7)}-31`));
  const yearSum = $derived(summarize(sessions, `${year}-01-01`, `${year}-12-31`));
  const next = $derived.by(() => {
    const now = toLocal(new Date());
    return sessions.find(
      (s) =>
        s.status === 'planned' && (s.date > now.date || (s.date === now.date && s.startTime >= now.time)),
    );
  });
  const limit = $derived(settings?.taxFreeLimitCents ?? 330000);
  const deadline = $derived.by(() => {
    const mmdd = settings?.reportDeadline ?? '12-15';
    const d = `${year}-${mmdd}`;
    const showFrom = addDays(d, -14) < `${year}-12-01` ? addDays(d, -14) : `${year}-12-01`;
    return today >= showFrom && today <= d ? formatDeadline(mmdd, year) : null;
  });
  const [first, ...rest] = $derived(open);

  async function load() {
    const [s, o, cfg] = await Promise.all([
      api.sessions(`${year}-01-01`, addDays(today, 60)),
      api.open(),
      api.settings(),
    ]);
    sessions = s;
    open = o;
    settings = cfg;
    loaded = true;
  }

  $effect(() => {
    void app.revision;
    load().catch((e) => toast((e as Error).message, 'error'));
  });

  async function quick(s: SessionDto, status: 'held' | 'not_held') {
    answering = s.id;
    try {
      await answerWithUndo(s, status);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      answering = null;
    }
  }
</script>

<PageHeader label={formatDateLongDe(today)} title={de.home.title}>
  {#snippet actions()}
    <Button href="/export" variant="secondary">
      <FileText size={20} strokeWidth={1.75} aria-hidden="true" />
      {de.home.report}
    </Button>
  {/snippet}
</PageHeader>

{#if deadline}
  <div
    class="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border-hl border-primary bg-surface p-4"
    role="status"
  >
    <p class="flex items-center gap-3 font-semibold">
      <FileText size={24} strokeWidth={1.75} aria-hidden="true" class="shrink-0" />
      {de.home.reportBanner(deadline)}
    </p>
    <Button href="/export">{de.home.report}</Button>
  </div>
{/if}

<!-- Anzeigetafel -->
<section
  class="relative mb-8 overflow-hidden rounded-md bg-scoreboard p-5 text-on-scoreboard md:p-7"
  aria-label={de.home.scoreboard}
>
  <FieldLines
    class="pointer-events-none absolute right-4 -bottom-6 hidden h-56 w-auto text-scoreboard-line lg:block"
    mark={false}
  />
  <dl class="relative grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
    <ScoreTile label={de.home.unitsYear(year)} value={yearSum.units} sub={de.home.held(yearSum.heldCount)} />
    <ScoreTile
      class="order-first col-span-2 sm:order-none sm:col-span-1"
      label={de.home.pay}
      value={formatCents(yearSum.payCents)}
      sub={String(year)}
      testid="sum-year"
    />
    <ScoreTile
      label={de.home.month}
      value={formatCents(month.payCents)}
      sub={de.home.held(month.heldCount)}
      testid="sum-month"
    />
  </dl>
  <div class="relative mt-6 max-w-xl">
    <CourtProgress
      value={yearSum.payCents}
      max={limit}
      label={de.home.taxFree}
      valueText={de.home.taxFreeOf(formatCents(yearSum.payCents), formatCents(limit))}
    />
  </div>
</section>

<div class="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
  <section aria-labelledby="open-h">
    <SectionHeader id="open-h" title={de.home.openTitle} count={loaded ? open.length : undefined} />
    {#if !loaded}
      <Skeleton rows={2} />
    {:else if !first}
      <Card><EmptyState text={de.home.openNone} /></Card>
    {:else}
      <div class="flex flex-col gap-3">
        <!-- the one question that counts: soft yellow + accent answer -->
        <SessionCard session={first} highlight onopen={() => (editing = first)}>
          {#snippet actions()}
            <Button
              variant="accent"
              loading={answering === first.id}
              onclick={() => quick(first, 'held')}
              aria-label="{de.status.held}: {formatDayMonthDe(first.date)}">{de.common.yes}</Button
            >
            <Button
              variant="secondary"
              disabled={answering === first.id}
              onclick={() => quick(first, 'not_held')}
              aria-label="{de.status.not_held}: {formatDayMonthDe(first.date)}">{de.common.no}</Button
            >
          {/snippet}
        </SessionCard>
        {#each rest.slice(0, OPEN_PREVIEW - 1) as s (s.id)}
          <SessionCard session={s} onopen={() => (editing = s)}>
            {#snippet actions()}
              <Button
                variant="secondary"
                size="sm"
                class="min-h-12"
                loading={answering === s.id}
                onclick={() => quick(s, 'held')}
                aria-label="{de.status.held}: {formatDayMonthDe(s.date)}">{de.common.yes}</Button
              >
              <Button
                variant="ghost"
                size="sm"
                class="min-h-12"
                disabled={answering === s.id}
                onclick={() => quick(s, 'not_held')}
                aria-label="{de.status.not_held}: {formatDayMonthDe(s.date)}">{de.common.no}</Button
              >
            {/snippet}
          </SessionCard>
        {/each}
        {#if open.length >= 3}
          <Button href="/offen" variant="secondary" full>{de.home.openMore(open.length)}</Button>
        {/if}
      </div>
    {/if}
  </section>

  <section aria-labelledby="next-h">
    <SectionHeader id="next-h" title={de.home.next} />
    {#if next}
      <Card class="flex items-center gap-5">
        <div class="flex w-16 shrink-0 flex-col items-center border-r-hl border-line pr-5">
          <span class="font-score text-3xl font-bold uppercase">{weekdayLongDe(next.date).slice(0, 2)}</span>
          <span class="font-score text-lg font-semibold text-muted"
            >{formatDayMonthDe(next.date).slice(4)}</span
          >
        </div>
        <div class="min-w-0">
          <p class="font-score text-2xl font-semibold">{next.startTime}–{next.endTime}</p>
          <p class="truncate font-medium">{[next.team, next.title].filter(Boolean).join(' · ')}</p>
          {#if next.location}
            <p class="flex items-center gap-1.5 truncate text-sm text-muted">
              <MapPin size={16} strokeWidth={1.75} aria-hidden="true" class="shrink-0" />{next.location}
            </p>
          {/if}
        </div>
      </Card>
    {:else if loaded}
      <Card>
        <p class="text-muted">{de.home.nextNone}</p>
        <Button href="/neu" variant="secondary" class="mt-3">{de.home.newSeries}</Button>
      </Card>
    {:else}
      <Skeleton rows={1} />
    {/if}
  </section>
</div>

<SessionEditor bind:session={editing} />
