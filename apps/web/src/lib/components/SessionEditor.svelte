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
  import Modal from './Modal.svelte';

  let { session = $bindable(null), onsaved }: { session: SessionDto | null; onsaved?: () => void } = $props();

  let open = $state(false);
  let askScope = $state(false);
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
  <Modal bind:open title={de.sessions.edit} onclose={close}>
    {#if askScope}
      <div class="flex flex-col gap-3" data-testid="scope-dialog">
        <p class="font-medium">{de.sessions.scopeQuestion}</p>
        <button class="btn-secondary justify-start" disabled={busy} onclick={() => saveScope('one')}
          >{de.sessions.scopeOne}</button
        >
        <button class="btn-secondary justify-start" disabled={busy} onclick={() => saveScope('following')}
          >{de.sessions.scopeFollowing}</button
        >
        <button class="btn-secondary justify-start" disabled={busy} onclick={() => saveScope('all')}
          >{de.sessions.scopeAll}</button
        >
        <button class="btn" onclick={() => (askScope = false)}>{de.common.back}</button>
      </div>
    {:else}
      <form class="grid grid-cols-2 gap-3" onsubmit={save}>
        <p class="col-span-2 text-sm text-ink-muted">{formatDateDe(session.date)}</p>
        <label class="col-span-2"
          ><span class="label">{de.form.title}</span><input
            class="input"
            bind:value={f.title}
            required
          /></label
        >
        <label><span class="label">{de.form.team}</span><input class="input" bind:value={f.team} /></label>
        <label
          ><span class="label">{de.form.kind}</span>
          <select class="input" bind:value={f.kind}>
            {#each SESSION_KINDS as k (k)}<option value={k}>{de.kind[k]}</option>{/each}
          </select>
        </label>
        <label class="col-span-2"
          ><span class="label">{de.form.date}</span><input
            class="input"
            type="date"
            bind:value={f.date}
            required
          /></label
        >
        <label
          ><span class="label">{de.form.start}</span><input
            class="input"
            type="time"
            bind:value={f.startTime}
            required
          /></label
        >
        <label
          ><span class="label">{de.form.end}</span><input
            class="input"
            type="time"
            bind:value={f.endTime}
            required
          /></label
        >
        <label class="col-span-2"
          ><span class="label">{de.form.location}</span><input class="input" bind:value={f.location} /></label
        >
        <label
          ><span class="label">{de.form.units}</span><input
            class="input"
            type="number"
            min="0"
            max="20"
            bind:value={f.units}
          /></label
        >
        <label
          ><span class="label">{de.form.pay}</span><input
            class="input"
            inputmode="decimal"
            bind:value={f.pay}
          /></label
        >
        <label class="col-span-2"
          ><span class="label">{de.sessions.columns.status}</span>
          <select class="input" bind:value={f.status}>
            {#each SESSION_STATUSES as st (st)}<option value={st}>{de.status[st]}</option>{/each}
          </select>
        </label>
        <label class="col-span-2"
          ><span class="label">{de.sessions.note}</span><input
            class="input"
            bind:value={f.note}
            maxlength="500"
          /></label
        >
        <div class="col-span-2 mt-2 flex flex-wrap gap-2">
          <button class="btn-primary flex-1" type="submit" disabled={busy}>{de.common.save}</button>
          {#if session.seriesId}
            <button
              class="btn-secondary"
              type="button"
              disabled={busy}
              onclick={() => run(() => api.patchSession(session!.id, { status: 'cancelled' }))}
              >{de.sessions.cancelSession}</button
            >
          {:else}
            <button
              class="btn-danger"
              type="button"
              disabled={busy}
              onclick={() => run(() => api.deleteSession(session!.id))}>{de.sessions.deleteSingle}</button
            >
          {/if}
        </div>
      </form>
    {/if}
  </Modal>
{/if}
