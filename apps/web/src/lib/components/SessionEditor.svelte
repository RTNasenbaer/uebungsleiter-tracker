<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import {
    SESSION_KINDS,
    SESSION_STATUSES,
    centsToEuroString,
    formatDateDe,
    parseEuroToCents,
    type SessionDto,
    type SessionKind,
    type SessionStatus,
  } from '@ult/shared';
  import { api } from '$lib/api';
  import { de } from '$lib/i18n/de';
  import { bumpRevision, toast } from '$lib/state.svelte';
  import Ban from 'lucide-svelte/icons/ban';
  import Trash2 from 'lucide-svelte/icons/trash-2';
  import Button from './ui/Button.svelte';
  import Dialog from './ui/Dialog.svelte';
  import RadioCard from './ui/RadioCard.svelte';
  import Select from './ui/Select.svelte';
  import TextField from './ui/TextField.svelte';

  let { session = $bindable(null), onsaved }: { session: SessionDto | null; onsaved?: () => void } = $props();

  let open = $state(false);
  let askScope = $state(false);
  let scope = $state<'one' | 'following' | 'all'>('one');
  let busy = $state(false);
  let f = $state({
    date: '',
    startTime: '',
    endTime: '',
    title: '',
    team: '',
    location: '',
    units: 1,
    pay: '',
    kind: 'training' as SessionKind,
    status: 'planned' as SessionStatus,
    note: '',
  });

  $effect(() => {
    if (!session) {
      open = false;
      return;
    }
    f = {
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      title: session.title,
      team: session.team,
      location: session.location,
      units: session.units,
      pay: centsToEuroString(session.payCents),
      kind: session.kind,
      status: session.status,
      note: session.note ?? '',
    };
    askScope = false;
    scope = 'one';
    open = true;
  });

  const seriesFieldsChanged = $derived(
    !!session &&
      (f.startTime !== session.startTime ||
        f.endTime !== session.endTime ||
        f.title !== session.title ||
        f.team !== session.team ||
        f.location !== session.location ||
        f.units !== session.units ||
        parseEuroToCents(f.pay) !== session.payCents),
  );

  function close() {
    session = null;
  }

  async function run(fn: () => Promise<unknown>) {
    busy = true;
    try {
      await fn();
      toast(de.common.saved);
      bumpRevision();
      onsaved?.();
      close();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      busy = false;
    }
  }

  function patchBody() {
    const payCents = parseEuroToCents(f.pay);
    if (payCents === null) throw new Error(de.form.invalidPay);
    return {
      date: f.date,
      startTime: f.startTime,
      endTime: f.endTime,
      title: f.title,
      team: f.team,
      location: f.location,
      units: Number(f.units),
      payCents,
      kind: f.kind,
      status: f.status,
      note: f.note.trim() || null,
    };
  }

  function save(e: Event) {
    e.preventDefault();
    if (session?.seriesId && seriesFieldsChanged && f.date === session.date) {
      askScope = true;
      return;
    }
    run(() => api.patchSession(session!.id, patchBody()));
  }

  async function saveScope(scope: 'one' | 'following' | 'all') {
    const s = session!;
    if (scope === 'one') return run(() => api.patchSession(s.id, patchBody()));
    await run(async () => {
      const body = patchBody();
      const series = (await api.series()).find((x) => x.id === s.seriesId);
      if (!series) throw new Error('Training nicht gefunden');
      const { id: _id, ...rest } = series;
      const updated = {
        ...rest,
        title: body.title,
        team: body.team,
        location: body.location,
        startTime: body.startTime,
        endTime: body.endTime,
        units: body.units,
        payCents: body.payCents,
      };
      await api.updateSeries(series.id, updated, scope === 'all' ? 'all' : 'following', s.date);
      // status / note always belong to this one session
      if (body.status !== s.status || body.note !== (s.note ?? null)) {
        const fresh = (await api.sessions(s.date, s.date)).find(
          (x) => x.date === s.date && x.status !== 'cancelled',
        );
        if (fresh) await api.patchSession(fresh.id, { status: body.status, note: body.note });
      }
    });
  }
</script>

{#if session}
  <Dialog
    bind:open
    title={askScope ? de.sessions.scopeTitle : de.sessions.edit}
    label={formatDateDe(session.date)}
    onclose={close}
  >
    {#if askScope}
      <div class="flex flex-col gap-3" data-testid="scope-dialog">
        <p class="font-medium">{de.sessions.scopeQuestion}</p>
        <div class="flex flex-col gap-2" role="radiogroup" aria-label={de.sessions.scopeQuestion}>
          <RadioCard
            name="scope"
            value="one"
            bind:group={scope}
            title={de.sessions.scopeOne}
            description={de.sessions.scopeOneHint}
          />
          <RadioCard
            name="scope"
            value="following"
            bind:group={scope}
            title={de.sessions.scopeFollowing}
            description={de.sessions.scopeFollowingHint}
          />
          <RadioCard
            name="scope"
            value="all"
            bind:group={scope}
            title={de.sessions.scopeAll}
            description={de.sessions.scopeAllHint}
          />
        </div>
        <div class="mt-2 flex flex-wrap gap-2">
          <Button class="flex-1" loading={busy} onclick={() => saveScope(scope)}
            >{de.sessions.scopeApply}</Button
          >
          <Button variant="ghost" onclick={() => (askScope = false)}>{de.common.back}</Button>
        </div>
      </div>
    {:else}
      <form id="session-form" class="grid grid-cols-2 gap-4" onsubmit={save}>
        <TextField class="col-span-2" label={de.form.title} bind:value={f.title} required />
        <TextField label={de.form.team} bind:value={f.team} />
        <Select
          label={de.form.kind}
          bind:value={f.kind}
          options={SESSION_KINDS.map((k) => ({ value: k, label: de.kind[k] }))}
        />
        <TextField class="col-span-2" type="date" label={de.form.date} bind:value={f.date} required />
        <TextField type="time" label={de.form.start} bind:value={f.startTime} required />
        <TextField type="time" label={de.form.end} bind:value={f.endTime} required />
        <TextField class="col-span-2" label={de.form.location} bind:value={f.location} />
        <TextField
          type="number"
          label={de.form.units}
          bind:value={f.units}
          min={0}
          max={20}
          inputmode="numeric"
        />
        <TextField label={de.form.pay} bind:value={f.pay} inputmode="decimal" />
        <Select
          class="col-span-2"
          label={de.sessions.columns.status}
          bind:value={f.status}
          options={SESSION_STATUSES.map((st) => ({ value: st, label: de.status[st] }))}
        />
        <TextField class="col-span-2" label={de.sessions.note} bind:value={f.note} maxlength={500} />
        <div class="col-span-2 mt-2 flex flex-wrap gap-2">
          <Button type="submit" class="flex-1" loading={busy}>{de.common.save}</Button>
          {#if session.seriesId}
            <Button
              variant="secondary"
              disabled={busy}
              onclick={() => run(() => api.patchSession(session!.id, { status: 'cancelled' }))}
            >
              <Ban size={18} strokeWidth={1.75} aria-hidden="true" />{de.sessions.cancelSession}</Button
            >
          {:else}
            <Button
              variant="ghost"
              class="text-danger"
              disabled={busy}
              onclick={() => run(() => api.deleteSession(session!.id))}
            >
              <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />{de.sessions.deleteSingle}</Button
            >
          {/if}
        </div>
      </form>
    {/if}
  </Dialog>
{/if}
