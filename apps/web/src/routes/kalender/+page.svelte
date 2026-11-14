<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import {
    MONTHS_DE,
    WEEKDAY_LABELS,
    addDays,
    formatDateDe,
    lastDayOfMonth,
    mondayOf,
    systemClock,
    todayIn,
    type SessionDto,
  } from '@ult/shared';
  import { api } from '$lib/api';
  import SessionEditor from '$lib/components/SessionEditor.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import { de } from '$lib/i18n/de';
  import { app } from '$lib/state.svelte';

  const today = todayIn(systemClock);
  let ym = $state({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) });
  let sessions = $state<SessionDto[]>([]);
  let selectedDay = $state<string | null>(today);
  let editing = $state<SessionDto | null>(null);

  const first = $derived(`${ym.y}-${String(ym.m).padStart(2, '0')}-01`);
  const last = $derived(lastDayOfMonth(ym.y, ym.m));
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

  $effect(() => {
    void app.revision;
    api.sessions(first, last).then((s) => (sessions = s));
  });

  function shift(delta: number) {
    const m0 = ym.m - 1 + delta;
    ym = { y: ym.y + Math.floor(m0 / 12), m: (((m0 % 12) + 12) % 12) + 1 };
    selectedDay = null;
  }

  const dot: Record<string, string> = {
    planned: 'bg-status-planned',
    pending: 'bg-status-pending',
    held: 'bg-status-held',
    not_held: 'bg-status-not-held',
    cancelled: 'bg-status-cancelled opacity-40',
  };
</script>

<h1 class="h1">{de.calendar.title}</h1>

<div class="card">
  <div class="mb-3 flex items-center justify-between gap-2">
    <button class="btn-secondary min-w-touch" aria-label={de.calendar.prev} onclick={() => shift(-1)}
      >‹</button
    >
    <h2 class="text-lg font-semibold" aria-live="polite">{MONTHS_DE[ym.m - 1]} {ym.y}</h2>
    <button class="btn-secondary min-w-touch" aria-label={de.calendar.next} onclick={() => shift(1)}>›</button
    >
  </div>

  <!-- Month grid (also usable on phones; the day list below shows details) -->
  <div class="grid grid-cols-7 gap-1 text-center" aria-label="{MONTHS_DE[ym.m - 1]} {ym.y}" role="group">
    {#each WEEKDAY_LABELS as w (w)}
      <div class="pb-1 text-xs font-semibold text-ink-muted" aria-hidden="true">{w}</div>
    {/each}
    {#each gridDays as d (d)}
      {@const inMonth = d >= first && d <= last}
      {@const list = byDay[d] ?? []}
      <button
        class="flex min-h-14 flex-col items-center gap-1 rounded-lg border p-1 text-sm md:min-h-20 {selectedDay ===
        d
          ? 'border-brand-700 bg-brand-50'
          : 'border-transparent hover:bg-surface-muted'} {inMonth ? '' : 'bg-surface-muted text-ink-muted'}"
        aria-pressed={selectedDay === d}
        aria-label="{formatDateDe(d)}, {list.length} {list.length === 1 ? 'Termin' : 'Termine'}"
        onclick={() => (selectedDay = d)}
      >
        <span class={d === today ? 'rounded-full bg-brand-700 px-1.5 font-bold text-white' : ''}
          >{Number(d.slice(8))}</span
        >
        <span class="flex flex-wrap justify-center gap-0.5">
          {#each list as s (s.id)}
            <span class="size-2.5 rounded-full {dot[s.status]}" title={de.status[s.status]}></span>
          {/each}
        </span>
        <span class="hidden w-full truncate text-[0.7rem] md:block">
          {list.map((s) => s.team || s.title).join(', ')}
        </span>
      </button>
    {/each}
  </div>
</div>

{#if selectedDay}
  <section class="card mt-4" aria-live="polite">
    <h2 class="h2">{formatDateDe(selectedDay)}</h2>
    {#if daySessions.length === 0}
      <p class="text-ink-muted">{de.calendar.noSessions}</p>
    {:else}
      <ul class="flex flex-col divide-y divide-line">
        {#each daySessions as s (s.id)}
          <li>
            <button
              class="flex min-h-touch w-full items-center justify-between gap-2 py-2 text-left"
              onclick={() => (editing = s)}
            >
              <span>
                <span class="font-medium">{s.startTime}–{s.endTime}</span>
                {[s.team, s.title, s.location].filter(Boolean).join(' · ')}
              </span>
              <StatusBadge status={s.status} />
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}

<SessionEditor bind:session={editing} />
