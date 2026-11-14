<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import { MONTHS_DE, type SessionDto } from '@ult/shared';
  import { api } from '$lib/api';
  import { bulkWithUndo } from '$lib/answers';
  import SessionEditor from '$lib/components/SessionEditor.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
  import SessionCard from '$lib/components/ui/SessionCard.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import { de } from '$lib/i18n/de';
  import { app, toast } from '$lib/state.svelte';

  let open = $state<SessionDto[]>([]);
  const selected = new SvelteSet<string>();
  let loaded = $state(false);
  let busy = $state<'held' | 'not_held' | null>(null);
  let editing = $state<SessionDto | null>(null);
  const allSelected = $derived(open.length > 0 && selected.size === open.length);
  const groups = $derived.by(() => {
    const map = new Map<string, SessionDto[]>();
    for (const s of open) {
      const key = s.date.slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map].map(([key, items]) => ({
      key,
      title: `${MONTHS_DE[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`,
      items,
    }));
  });

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
    busy = status;
    try {
      await bulkWithUndo(
        open.filter((s) => selected.has(s.occurrenceKey)),
        status,
      );
      selected.clear();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      busy = null;
    }
  }
</script>

<PageHeader label={de.open.label} title={de.open.title} />
<p class="-mt-3 mb-6 max-w-prose text-muted">{de.open.intro}</p>

{#if !loaded}
  <Skeleton rows={4} />
{:else if open.length === 0}
  <Card>
    <EmptyState text={de.open.none}>
      {#snippet action()}<Button href="/kalender" variant="secondary">{de.open.toCalendar}</Button>{/snippet}
    </EmptyState>
  </Card>
{:else}
  <!-- bulk bar: fixed above the bottom navigation on phones, sticky at the top on larger screens -->
  <div
    class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t-hl border-line bg-surface px-4 py-2 md:sticky md:top-0 md:bottom-auto md:z-10 md:mb-6 md:rounded-md md:border-hl md:px-4"
  >
    <div class="mx-auto flex max-w-content flex-wrap items-center gap-x-4 gap-y-1">
      <Checkbox
        checked={allSelected}
        label={de.open.selectAll}
        onchange={() => {
          if (allSelected) selected.clear();
          else open.forEach((s) => selected.add(s.occurrenceKey));
        }}
      />
      <span class="text-sm text-muted" aria-live="polite">{de.open.selected(selected.size)}</span>
      <div class="ml-auto flex gap-2">
        <Button
          variant="accent"
          loading={busy === 'held'}
          disabled={!!busy || selected.size === 0}
          onclick={() => bulk('held')}
          aria-label={de.open.markHeld}>{de.open.markHeldShort}</Button
        >
        <Button
          variant="secondary"
          loading={busy === 'not_held'}
          disabled={!!busy || selected.size === 0}
          onclick={() => bulk('not_held')}
          aria-label={de.open.markNotHeld}>{de.open.markNotHeldShort}</Button
        >
      </div>
    </div>
  </div>

  <div class="flex flex-col gap-8 pb-28 md:pb-0" data-testid="open-list">
    {#each groups as g (g.key)}
      <section aria-labelledby="m-{g.key}">
        <SectionHeader id="m-{g.key}" title={g.title} count={g.items.length} />
        <ul class="flex flex-col gap-2">
          {#each g.items as s (s.id)}
            <li>
              <SessionCard
                session={s}
                selectable
                selected={selected.has(s.occurrenceKey)}
                onselect={() => toggle(s.occurrenceKey)}
                onopen={() => (editing = s)}
              />
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
{/if}

<SessionEditor bind:session={editing} />
