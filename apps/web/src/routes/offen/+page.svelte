<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import { formatDateDe, type SessionDto } from '@ult/shared';
  import { api } from '$lib/api';
  import SessionEditor from '$lib/components/SessionEditor.svelte';
  import { de } from '$lib/i18n/de';
  import { app, bumpRevision, toast } from '$lib/state.svelte';

  let open = $state<SessionDto[]>([]);
  const selected = new SvelteSet<string>();
  let loaded = $state(false);
  let busy = $state(false);
  let editing = $state<SessionDto | null>(null);
  const allSelected = $derived(open.length > 0 && selected.size === open.length);

  $effect(() => {
    void app.revision;
    api.open().then((o) => {
      open = o;
      for (const k of [...selected]) if (!o.some((s) => s.occurrenceKey === k)) selected.delete(k);
      loaded = true;
    });
  });

  function toggle(key: string) {
    if (selected.has(key)) selected.delete(key);
    else selected.add(key);
  }

  async function bulk(status: 'held' | 'not_held') {
    busy = true;
    try {
      const { updated } = await api.bulk([...selected], status);
      toast(de.open.updated(updated));
      selected.clear();
      bumpRevision();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      busy = false;
    }
  }
</script>

<h1 class="h1">{de.open.title}</h1>
<p class="mb-4 text-ink-muted">{de.open.intro}</p>

{#if loaded && open.length === 0}
  <p class="card text-center text-lg">{de.open.none}</p>
{:else if open.length > 0}
  <div class="card mb-3 flex flex-wrap items-center gap-3">
    <label class="flex min-h-touch items-center gap-2 font-medium">
      <input
        type="checkbox"
        class="size-5"
        checked={allSelected}
        onchange={() => {
          if (allSelected) selected.clear();
          else open.forEach((s) => selected.add(s.occurrenceKey));
        }}
      />
      {de.open.selectAll}
    </label>
    <span class="text-ink-muted" aria-live="polite">{de.open.selected(selected.size)}</span>
    <div class="flex flex-1 flex-wrap justify-end gap-2">
      <button class="btn-success" disabled={busy || selected.size === 0} onclick={() => bulk('held')}
        >{de.open.markHeld}</button
      >
      <button class="btn-secondary" disabled={busy || selected.size === 0} onclick={() => bulk('not_held')}
        >{de.open.markNotHeld}</button
      >
    </div>
  </div>
  <ul class="card flex flex-col divide-y divide-line p-0" data-testid="open-list">
    {#each open as s (s.id)}
      <li class="flex items-center gap-3 px-4 py-1">
        <input
          type="checkbox"
          class="size-5 shrink-0"
          checked={selected.has(s.occurrenceKey)}
          onchange={() => toggle(s.occurrenceKey)}
          aria-label="{formatDateDe(s.date)} {s.team} auswählen"
        />
        <button class="min-h-touch flex-1 py-2 text-left" onclick={() => (editing = s)}>
          <span class="font-medium">{formatDateDe(s.date)}</span>
          <span class="text-ink-muted"
            >· {s.startTime}–{s.endTime} · {[s.team, s.title].filter(Boolean).join(' ')}</span
          >
        </button>
      </li>
    {/each}
  </ul>
{/if}

<SessionEditor bind:session={editing} />
