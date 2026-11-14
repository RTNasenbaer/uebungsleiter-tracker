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
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import FilterChips from '$lib/components/ui/FilterChips.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import SessionCard from '$lib/components/ui/SessionCard.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';
  import { bulkWithUndo } from '$lib/answers';
  import { de } from '$lib/i18n/de';
  import { app, toast } from '$lib/state.svelte';

  const today = todayIn(systemClock);
  let from = $state(addDays(today, -30));
  let to = $state(addDays(today, 30));
  let status = $state<SessionStatus | ''>('');
  let team = $state('');
  let sessions = $state<SessionDto[]>([]);
  let loaded = $state(false);
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
        .then((s) => {
          sessions = s;
          loaded = true;
        })
        .catch((e) => toast(e.message, 'error'));
  });

  function toggle(key: string) {
    if (selected.has(key)) selected.delete(key);
    else selected.add(key);
  }

  async function bulk(st: 'held' | 'not_held') {
    try {
      await bulkWithUndo(
        sessions.filter((s) => selected.has(s.occurrenceKey)),
        st,
      );
      selected.clear();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }
</script>

<PageHeader label={de.sessions.label} title={de.sessions.title} />

<div class="mb-4 grid max-w-md grid-cols-2 gap-3">
  <TextField type="date" label={de.sessions.filterFrom} bind:value={from} />
  <TextField type="date" label={de.sessions.filterTo} bind:value={to} />
</div>
<div class="mb-3">
  <FilterChips
    legend={de.sessions.filterStatus}
    bind:value={status}
    options={[
      { value: '', label: de.common.all },
      ...SESSION_STATUSES.map((st) => ({ value: st, label: de.status[st] })),
    ]}
  />
</div>
{#if teams.length > 1}
  <div class="mb-6">
    <FilterChips
      legend={de.sessions.filterTeam}
      bind:value={team}
      options={[{ value: '', label: de.sessions.allTeams }, ...teams.map((t) => ({ value: t, label: t }))]}
    />
  </div>
{/if}

{#if selected.size > 0}
  <div
    class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 flex flex-wrap items-center gap-2 border-t-hl border-line bg-surface px-4 pt-2 pb-8 md:sticky md:top-0 md:bottom-auto md:z-10 md:mb-4 md:rounded-md md:border-hl"
  >
    <span class="flex-1 text-sm font-medium" aria-live="polite">{de.open.selected(selected.size)}</span>
    <Button variant="accent" onclick={() => bulk('held')} aria-label={de.open.markHeld}
      >{de.open.markHeldShort}</Button
    >
    <Button variant="secondary" onclick={() => bulk('not_held')} aria-label={de.open.markNotHeld}
      >{de.open.markNotHeldShort}</Button
    >
  </div>
{/if}

{#if !loaded}
  <Skeleton rows={4} />
{:else if filtered.length === 0}
  <Card><EmptyState text={de.sessions.none} /></Card>
{:else}
  <!-- phones: cards -->
  <ul class="flex flex-col gap-2 pb-28 md:hidden">
    {#each filtered as s (s.id)}
      <li>
        <SessionCard
          session={s}
          selectable
          selected={selected.has(s.occurrenceKey)}
          onselect={() => toggle(s.occurrenceKey)}
          onopen={() => (editing = s)}
          showMoney
        />
      </li>
    {/each}
  </ul>

  <!-- tablet/desktop: table -->
  <Card padded={false} class="hidden max-h-[70dvh] overflow-auto md:block">
    <table class="w-full border-collapse text-left text-sm">
      <thead class="sticky top-0 z-[1] bg-surface-sunken">
        <tr class="border-b-hl border-line">
          <th class="w-14 px-3 py-2"><span class="sr-only">{de.sessions.selection}</span></th>
          <th class="px-3 py-2 label-caps">{de.sessions.columns.date}</th>
          <th class="px-3 py-2 label-caps">{de.sessions.columns.time}</th>
          <th class="px-3 py-2 label-caps">{de.sessions.columns.team}</th>
          <th class="hidden px-3 py-2 label-caps lg:table-cell">{de.sessions.columns.title}</th>
          <th class="hidden px-3 py-2 label-caps xl:table-cell">{de.sessions.columns.location}</th>
          <th class="px-3 py-2 text-right label-caps">{de.sessions.columns.units}</th>
          <th class="px-3 py-2 text-right label-caps">{de.sessions.columns.pay}</th>
          <th class="px-3 py-2 label-caps">{de.sessions.columns.status}</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as s (s.id)}
          <tr class="h-13 border-b-hl border-line last:border-b-0 hover:bg-surface-sunken">
            <td class="px-1.5">
              <Checkbox
                checked={selected.has(s.occurrenceKey)}
                onchange={() => toggle(s.occurrenceKey)}
                hideLabel
                label={de.sessions.selectRow(formatDateDe(s.date))}
                class="justify-center"
              />
            </td>
            <td class="px-3 whitespace-nowrap">
              <button
                type="button"
                class="min-h-11 cursor-pointer font-semibold underline-offset-4 hover:underline"
                onclick={() => (editing = s)}>{formatDateDe(s.date)}</button
              >
            </td>
            <td class="px-3 whitespace-nowrap">{s.startTime}–{s.endTime}</td>
            <td class="px-3">{s.team}</td>
            <td class="hidden px-3 lg:table-cell">
              {s.title}{#if s.note}<span class="text-muted"> · {s.note}</span>{/if}
            </td>
            <td class="hidden px-3 text-muted xl:table-cell">{s.location}</td>
            <td class="px-3 text-right">{s.units}</td>
            <td class="px-3 text-right whitespace-nowrap">{formatCents(s.payCents)}</td>
            <td class="px-3"><StatusBadge status={s.status} size="sm" /></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </Card>
{/if}

<SessionEditor bind:session={editing} />
