<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import {
    addDays,
    formatCents,
    formatDateDe,
    formatDeadline,
    summarize,
    todayIn,
    toLocal,
    systemClock,
    type SessionDto,
    type SettingsDto,
  } from '@ult/shared';
  import { api } from '$lib/api';
  import SessionEditor from '$lib/components/SessionEditor.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import { de } from '$lib/i18n/de';
  import { app, bumpRevision, toast } from '$lib/state.svelte';

  const OPEN_PREVIEW = 5;
  let sessions = $state<SessionDto[]>([]);
  let open = $state<SessionDto[]>([]);
  let settings = $state<SettingsDto | null>(null);
  let editing = $state<SessionDto | null>(null);
  let loaded = $state(false);

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
  const progress = $derived(Math.min(100, Math.round((yearSum.payCents / limit) * 100)));
  const deadline = $derived.by(() => {
    const mmdd = settings?.reportDeadline ?? '12-15';
    const d = `${year}-${mmdd}`;
    const showFrom = addDays(d, -14) < `${year}-12-01` ? addDays(d, -14) : `${year}-12-01`;
    return today >= showFrom && today <= d ? formatDeadline(mmdd, year) : null;
  });

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
    await api.answer(s.occurrenceKey, status);
    toast(de.answer.done);
    bumpRevision();
  }
</script>

<h1 class="h1">{de.home.title}</h1>

{#if deadline}
  <div
    class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card bg-amber-100 p-4 text-amber-950"
    role="alert"
  >
    <strong>{de.home.reportBanner(deadline)}</strong>
    <a href="/export" class="btn-primary">{de.home.report}</a>
  </div>
{/if}

<div class="grid gap-4 md:grid-cols-2">
  <section class="card md:col-span-2" aria-labelledby="open-h">
    <h2 id="open-h" class="h2">
      {de.home.openTitle}
      {#if open.length}<span class="text-status-pending">({open.length})</span>{/if}
    </h2>
    {#if loaded && open.length === 0}
      <p class="text-ink-muted">{de.home.openNone}</p>
    {/if}
    <ul class="flex flex-col divide-y divide-line">
      {#each open.slice(0, OPEN_PREVIEW) as s (s.id)}
        <li class="flex flex-wrap items-center gap-2 py-2">
          <button class="min-h-touch flex-1 text-left" onclick={() => (editing = s)}>
            <span class="font-medium">{formatDateDe(s.date)}</span>
            <span class="text-ink-muted">· {s.startTime} · {[s.team, s.title].filter(Boolean).join(' ')}</span
            >
          </button>
          <button
            class="btn-success"
            onclick={() => quick(s, 'held')}
            aria-label="{de.status.held}: {formatDateDe(s.date)}">✓ {de.common.yes}</button
          >
          <button
            class="btn-secondary"
            onclick={() => quick(s, 'not_held')}
            aria-label="{de.status.not_held}: {formatDateDe(s.date)}">✗ {de.common.no}</button
          >
        </li>
      {/each}
    </ul>
    {#if open.length > OPEN_PREVIEW}
      <a href="/offen" class="mt-2 inline-block font-medium text-brand-700 underline"
        >{de.home.openMore(open.length)}</a
      >
    {/if}
  </section>

  <section class="card" aria-labelledby="next-h">
    <h2 id="next-h" class="h2">{de.home.next}</h2>
    {#if next}
      <p class="text-lg font-semibold">{formatDateDe(next.date)}, {next.startTime}–{next.endTime}</p>
      <p class="text-ink-muted">{[next.team, next.title, next.location].filter(Boolean).join(' · ')}</p>
      <div class="mt-2"><StatusBadge status={next.status} /></div>
    {:else if loaded}
      <p class="text-ink-muted">{de.home.nextNone}</p>
    {/if}
  </section>

  <section class="card" aria-labelledby="sum-h">
    <h2 id="sum-h" class="h2">{de.home.month} / {de.home.year}</h2>
    <dl class="grid grid-cols-2 gap-2">
      <div>
        <dt class="text-sm text-ink-muted">{de.home.month}</dt>
        <dd class="text-xl font-bold" data-testid="sum-month">{formatCents(month.payCents)}</dd>
        <dd class="text-sm text-ink-muted">{de.home.held(month.heldCount)}</dd>
      </div>
      <div>
        <dt class="text-sm text-ink-muted">{de.home.year} {year}</dt>
        <dd class="text-xl font-bold" data-testid="sum-year">{formatCents(yearSum.payCents)}</dd>
        <dd class="text-sm text-ink-muted">{de.home.units(yearSum.units)}</dd>
      </div>
    </dl>
    <div class="mt-4">
      <div class="mb-1 flex justify-between text-sm">
        <span>{de.home.taxFree}</span>
        <span>{de.home.taxFreeOf(formatCents(yearSum.payCents), formatCents(limit))}</span>
      </div>
      <div
        class="h-3 overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label={de.home.taxFree}
      >
        <div
          class="h-full rounded-full {progress >= 100 ? 'bg-status-not-held' : 'bg-status-held'}"
          style="width: {progress}%"
        ></div>
      </div>
    </div>
  </section>

  <div class="md:col-span-2">
    <a href="/export" class="btn-primary w-full md:w-auto">{de.home.report}</a>
  </div>
</div>

<SessionEditor bind:session={editing} />
