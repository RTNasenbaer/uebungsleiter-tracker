<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import {
    SESSION_STATUSES,
    addDays,
    formatCents,
    formatDateDe,
    sortTeams,
    systemClock,
    todayIn,
    type SessionDto,
    type SessionStatus,
  } from '@ult/shared';
  import { SvelteSet } from 'svelte/reactivity';
  import { api } from '$lib/api';
  import SessionEditor from '$lib/components/SessionEditor.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import { de } from '$lib/i18n/de';
  import { app, bumpRevision, toast } from '$lib/state.svelte';

  const today = todayIn(systemClock);
  let from = $state(addDays(today, -30));
  let to = $state(addDays(today, 30));
  let status = $state<SessionStatus | ''>('');
  let team = $state('');
  let sessions = $state<SessionDto[]>([]);
  const selected = new SvelteSet<string>();
  let editing = $state<SessionDto | null>(null);

  const teams = $derived(sortTeams(sessions.map((s) => s.team)));
  const filtered = $derived(
    sessions.filter((s) => (!status || s.status === status) && (!team || s.team === team)),
  );

  $effect(() => {
    void app.revision;
    if (from && to && from <= to)
      api
        .sessions(from, to)
        .then((s) => (sessions = s))
        .catch((e) => toast(e.message, 'error'));
  });

  function toggle(key: string) {
    if (selected.has(key)) selected.delete(key);
    else selected.add(key);
  }

  async function bulk(st: 'held' | 'not_held') {
    const { updated } = await api.bulk([...selected], st);
    toast(de.open.updated(updated));
    selected.clear();
    bumpRevision();
  }
</script>

<h1 class="h1">{de.sessions.title}</h1>

<div class="card mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
  <label
    ><span class="label">{de.sessions.filterFrom}</span><input
      class="input"
      type="date"
      bind:value={from}
    /></label
  >
  <label
    ><span class="label">{de.sessions.filterTo}</span><input
      class="input"
      type="date"
      bind:value={to}
    /></label
  >
  <label>
    <span class="label">{de.sessions.filterStatus}</span>
    <select class="input" bind:value={status}>
      <option value="">{de.common.all}</option>
      {#each SESSION_STATUSES as st (st)}<option value={st}>{de.status[st]}</option>{/each}
    </select>
  </label>
  <label>
    <span class="label">{de.sessions.filterTeam}</span>
    <select class="input" bind:value={team}>
      <option value="">{de.common.all}</option>
      {#each teams as t (t)}<option value={t}>{t}</option>{/each}
    </select>
  </label>
</div>

{#if selected.size > 0}
  <div class="card mb-3 flex flex-wrap items-center gap-2">
    <span class="flex-1">{de.open.selected(selected.size)}</span>
    <button class="btn-success" onclick={() => bulk('held')}>{de.open.markHeld}</button>
    <button class="btn-secondary" onclick={() => bulk('not_held')}>{de.open.markNotHeld}</button>
  </div>
{/if}

{#if filtered.length === 0}
  <p class="card text-ink-muted">{de.sessions.none}</p>
{:else}
  <div class="card overflow-x-auto p-0">
    <table class="w-full text-left text-sm">
      <thead class="border-b border-line text-ink-muted">
        <tr>
          <th class="p-3"><span class="sr-only">Auswahl</span></th>
          <th class="p-3">{de.sessions.columns.date}</th>
          <th class="p-3">{de.sessions.columns.time}</th>
          <th class="p-3">{de.sessions.columns.team}</th>
          <th class="hidden p-3 md:table-cell">{de.sessions.columns.title}</th>
          <th class="hidden p-3 lg:table-cell">{de.sessions.columns.location}</th>
          <th class="hidden p-3 md:table-cell">{de.sessions.columns.units}</th>
          <th class="hidden p-3 md:table-cell">{de.sessions.columns.pay}</th>
          <th class="p-3">{de.sessions.columns.status}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-line">
        {#each filtered as s (s.id)}
          <tr class="cursor-pointer hover:bg-surface-muted" onclick={() => (editing = s)}>
            <td class="p-3" onclick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                class="size-5"
                checked={selected.has(s.occurrenceKey)}
                onchange={() => toggle(s.occurrenceKey)}
                aria-label="{formatDateDe(s.date)} auswählen"
              />
            </td>
            <td class="p-3 whitespace-nowrap">
              <button
                class="text-left font-medium underline-offset-2 hover:underline"
                onclick={() => (editing = s)}>{formatDateDe(s.date)}</button
              >
            </td>
            <td class="p-3 whitespace-nowrap">{s.startTime}–{s.endTime}</td>
            <td class="p-3">{s.team}</td>
            <td class="hidden p-3 md:table-cell">{s.title}{s.note ? ` (${s.note})` : ''}</td>
            <td class="hidden p-3 lg:table-cell">{s.location}</td>
            <td class="hidden p-3 md:table-cell">{s.units}</td>
            <td class="hidden p-3 whitespace-nowrap md:table-cell">{formatCents(s.payCents)}</td>
            <td class="p-3"><StatusBadge status={s.status} /></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<SessionEditor bind:session={editing} />
