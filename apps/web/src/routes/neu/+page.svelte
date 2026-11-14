<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- "+ Neu" (§4.1): single training or recurring series; also used to edit a series (?series=id). -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import {
    SESSION_KINDS,
    centsToEuroString,
    countPastOccurrences,
    parseEuroToCents,
    systemClock,
    todayIn,
    weekdayOf,
    type ExceptionDef,
    type SessionKind,
  } from '@ult/shared';
  import { api } from '$lib/api';
  import WeekdayChips from '$lib/components/WeekdayChips.svelte';
  import { de } from '$lib/i18n/de';
  import { bumpRevision, toast } from '$lib/state.svelte';

  const today = todayIn(systemClock);
  const editId = $derived(page.url.searchParams.get('series'));
  const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#4b5563'];

  let f = $state({
    title: 'Training',
    team: '',
    location: '',
    date: today,
    startTime: '18:00',
    endTime: '19:30',
    units: 1,
    pay: '15,00',
    kind: 'training' as SessionKind,
    note: '',
    repeat: false,
    weekdays: 1 << (weekdayOf(today) - 1),
    intervalWeeks: 1,
    endsMode: 'never' as 'never' | 'date',
    endsOn: '',
    alarmOffsetMin: 10,
    color: COLORS[0]!,
  });
  let exceptions = $state<ExceptionDef[]>([]);
  let busy = $state(false);
  let error = $state('');

  $effect(() => {
    api.exceptions().then((e) => (exceptions = e));
    if (!editId) {
      api.settings().then((s) => (f.pay = centsToEuroString(s.defaultPayCents)));
      return;
    }
    api.series().then((list) => {
      const s = list.find((x) => x.id === editId);
      if (!s) return;
      f = {
        ...f,
        title: s.title,
        team: s.team,
        location: s.location,
        date: s.startsOn,
        startTime: s.startTime,
        endTime: s.endTime,
        units: s.units,
        pay: centsToEuroString(s.payCents),
        repeat: true,
        weekdays: s.weekdays,
        intervalWeeks: s.intervalWeeks,
        endsMode: s.endsOn ? 'date' : 'never',
        endsOn: s.endsOn ?? '',
        alarmOffsetMin: s.alarmOffsetMin,
        color: s.color,
      };
    });
  });

  // choosing a start date pre-selects its weekday when nothing else was picked yet
  let lastDate = today;
  $effect(() => {
    if (f.date && f.date !== lastDate) {
      if (!editId && f.weekdays === 1 << (weekdayOf(lastDate) - 1)) f.weekdays = 1 << (weekdayOf(f.date) - 1);
      lastDate = f.date;
    }
  });

  const pastCount = $derived.by(() => {
    if (!f.repeat || editId || !f.date || f.date >= today || f.weekdays === 0) return 0;
    return countPastOccurrences(
      {
        id: 'preview',
        title: f.title,
        team: f.team,
        location: f.location,
        weekdays: f.weekdays,
        startTime: f.startTime,
        endTime: f.endTime,
        intervalWeeks: f.intervalWeeks,
        startsOn: f.date,
        endsOn: f.endsMode === 'date' && f.endsOn ? f.endsOn : null,
        units: f.units,
        payCents: 0,
        alarmOffsetMin: f.alarmOffsetMin,
        active: true,
      },
      today,
      exceptions,
    );
  });

  async function submit(e: Event) {
    e.preventDefault();
    error = '';
    const payCents = parseEuroToCents(f.pay);
    if (payCents === null) return (error = de.form.invalidPay);
    if (f.repeat && f.weekdays === 0) return (error = de.form.weekdayRequired);
    busy = true;
    try {
      if (f.repeat) {
        const body = {
          title: f.title,
          team: f.team,
          location: f.location,
          weekdays: f.weekdays,
          startTime: f.startTime,
          endTime: f.endTime,
          intervalWeeks: f.intervalWeeks,
          startsOn: f.date,
          endsOn: f.endsMode === 'date' && f.endsOn ? f.endsOn : null,
          units: Number(f.units),
          payCents,
          alarmOffsetMin: Number(f.alarmOffsetMin),
          color: f.color,
        };
        if (editId) await api.updateSeries(editId, body, 'all');
        else await api.createSeries(body);
        toast(editId ? de.common.saved : de.form.created);
        bumpRevision();
        goto(pastCount > 0 ? '/offen' : '/trainings');
      } else {
        await api.createSession({
          date: f.date,
          startTime: f.startTime,
          endTime: f.endTime,
          title: f.title,
          team: f.team,
          location: f.location,
          units: Number(f.units),
          payCents,
          kind: f.kind,
          note: f.note.trim() || null,
        });
        toast(de.form.created);
        bumpRevision();
        goto(f.date < today ? '/offen' : '/kalender');
      }
    } catch (err) {
      error = (err as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<h1 class="h1">{editId ? de.form.editSeriesTitle : de.form.newTitle}</h1>

<form class="card grid grid-cols-2 gap-4" onsubmit={submit}>
  <label class="col-span-2 md:col-span-1">
    <span class="label">{de.form.title}</span>
    <input
      class="input"
      bind:value={f.title}
      placeholder={de.form.titlePlaceholder}
      required
      maxlength="100"
    />
  </label>
  <label class="col-span-2 md:col-span-1">
    <span class="label">{de.form.team}</span>
    <input class="input" bind:value={f.team} placeholder={de.form.teamPlaceholder} maxlength="60" />
  </label>

  <label class="col-span-2 md:col-span-1">
    <span class="label">{f.repeat ? de.form.startDate : de.form.date}</span>
    <input class="input" type="date" bind:value={f.date} required />
  </label>
  <div class="col-span-2 grid grid-cols-2 gap-4 md:col-span-1">
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
  </div>

  <label class="col-span-2">
    <span class="label">{de.form.location}</span>
    <input class="input" bind:value={f.location} maxlength="120" />
  </label>
  <label>
    <span class="label">{de.form.units}</span>
    <input class="input" type="number" min="0" max="20" bind:value={f.units} />
  </label>
  <label>
    <span class="label">{de.form.pay}</span>
    <input class="input" inputmode="decimal" bind:value={f.pay} />
  </label>

  {#if !editId}
    <label class="col-span-2 flex min-h-touch items-center gap-3 font-medium">
      <input type="checkbox" role="switch" class="size-6" bind:checked={f.repeat} />
      {de.form.repeat}
    </label>
  {/if}

  {#if f.repeat}
    <div class="col-span-2"><WeekdayChips bind:value={f.weekdays} /></div>
    <fieldset class="col-span-2 md:col-span-1">
      <legend class="label">{de.form.interval}</legend>
      <div class="flex gap-2">
        {#each [1, 2] as n (n)}
          <label class="btn-secondary flex-1 has-checked:border-brand-700 has-checked:bg-brand-50">
            <input type="radio" class="sr-only" name="interval" value={n} bind:group={f.intervalWeeks} />
            {n === 1 ? de.form.interval1 : de.form.interval2}
          </label>
        {/each}
      </div>
    </fieldset>
    <fieldset class="col-span-2 md:col-span-1">
      <legend class="label">{de.form.ends}</legend>
      <div class="flex gap-2">
        <label class="btn-secondary flex-1 has-checked:border-brand-700 has-checked:bg-brand-50">
          <input type="radio" class="sr-only" name="ends" value="never" bind:group={f.endsMode} />{de.form
            .endsNever}
        </label>
        <label class="btn-secondary flex-1 has-checked:border-brand-700 has-checked:bg-brand-50">
          <input type="radio" class="sr-only" name="ends" value="date" bind:group={f.endsMode} />{de.form
            .endsOn}
        </label>
      </div>
      {#if f.endsMode === 'date'}
        <label class="mt-2 block">
          <span class="sr-only">{de.form.endDate}</span>
          <input
            class="input"
            type="date"
            bind:value={f.endsOn}
            min={f.date}
            required
            aria-label={de.form.endDate}
          />
        </label>
      {/if}
    </fieldset>
    <label>
      <span class="label">{de.form.alarmOffset}</span>
      <input class="input" type="number" min="0" max="600" bind:value={f.alarmOffsetMin} />
    </label>
    <fieldset>
      <legend class="label">{de.form.color}</legend>
      <div class="flex flex-wrap gap-2">
        {#each COLORS as c (c)}
          <label
            class="flex size-12 cursor-pointer items-center justify-center rounded-full border-2 has-checked:border-ink"
            style="background: {c}"
          >
            <input type="radio" class="sr-only" name="color" value={c} bind:group={f.color} aria-label={c} />
          </label>
        {/each}
      </div>
    </fieldset>
    {#if pastCount > 0}
      <p class="col-span-2 rounded-lg bg-amber-100 p-3 text-amber-950" role="status" data-testid="past-hint">
        {de.form.pastHint(pastCount)}
      </p>
    {/if}
  {:else}
    <label>
      <span class="label">{de.form.kind}</span>
      <select class="input" bind:value={f.kind}>
        {#each SESSION_KINDS as k (k)}<option value={k}>{de.kind[k]}</option>{/each}
      </select>
    </label>
    <label>
      <span class="label">{de.form.note}</span>
      <input class="input" bind:value={f.note} maxlength="500" />
    </label>
  {/if}

  {#if error}<p class="col-span-2 text-red-700" role="alert">{error}</p>{/if}
  <div class="col-span-2 flex gap-2">
    <button class="btn-primary flex-1" type="submit" disabled={busy}>{de.common.save}</button>
    <a class="btn-secondary" href={editId ? '/trainings' : '/'}>{de.common.cancel}</a>
  </div>
</form>
