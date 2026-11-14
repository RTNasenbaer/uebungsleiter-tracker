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
  import Info from 'lucide-svelte/icons/info';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import Switch from '$lib/components/ui/Switch.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';
  import WeekdayChips from '$lib/components/ui/WeekdayChips.svelte';
  import { SERIES_COLORS } from '$lib/styles/tokens.gen';
  import { de } from '$lib/i18n/de';
  import { bumpRevision, toast } from '$lib/state.svelte';

  const today = todayIn(systemClock);
  const editId = $derived(page.url.searchParams.get('series'));
  const COLORS: readonly string[] = SERIES_COLORS;

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
  let weekdayError = $state<string | null>(null);
  let payError = $state<string | null>(null);

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
    payError = null;
    weekdayError = null;
    const payCents = parseEuroToCents(f.pay);
    if (payCents === null) return (payError = de.form.invalidPay);
    if (f.repeat && f.weekdays === 0) return (weekdayError = de.form.weekdayRequired);
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

<PageHeader
  label={editId ? de.nav.series : de.nav.new}
  title={editId ? de.form.editSeriesTitle : de.form.newTitle}
/>

<form class="flex max-w-form flex-col gap-8 pb-24 md:pb-0" onsubmit={submit} novalidate={false}>
  <section aria-labelledby="sec-what" class="flex flex-col gap-4">
    <SectionHeader id="sec-what" title={de.form.sectionWhat} />
    <TextField
      label={de.form.title}
      bind:value={f.title}
      placeholder={de.form.titlePlaceholder}
      required
      maxlength={100}
    />
    <TextField
      label={de.form.team}
      bind:value={f.team}
      placeholder={de.form.teamPlaceholder}
      maxlength={60}
    />
    <TextField type="date" label={f.repeat ? de.form.startDate : de.form.date} bind:value={f.date} required />
    <div class="grid grid-cols-2 gap-3">
      <TextField type="time" label={de.form.start} bind:value={f.startTime} required />
      <TextField type="time" label={de.form.end} bind:value={f.endTime} required />
    </div>
    <TextField label={de.form.location} bind:value={f.location} maxlength={120} />
  </section>

  <section aria-labelledby="sec-repeat" class="flex flex-col gap-4">
    <SectionHeader id="sec-repeat" title={de.form.sectionRepeat} />
    {#if !editId}
      <Card class="py-2 md:py-2"><Switch label={de.form.repeat} bind:checked={f.repeat} /></Card>
    {/if}
    {#if f.repeat}
      <WeekdayChips bind:value={f.weekdays} error={weekdayError} />
      <SegmentedControl
        legend={de.form.interval}
        bind:value={f.intervalWeeks}
        options={[
          { value: 1, label: de.form.interval1 },
          { value: 2, label: de.form.interval2 },
        ]}
      />
      <SegmentedControl
        legend={de.form.ends}
        bind:value={f.endsMode}
        options={[
          { value: 'never', label: de.form.endsNever },
          { value: 'date', label: de.form.endsOn },
        ]}
      />
      {#if f.endsMode === 'date'}
        <TextField type="date" label={de.form.endDate} bind:value={f.endsOn} min={f.date} required />
      {/if}
      {#if pastCount > 0}
        <div class="flex items-start gap-3 rounded-md bg-surface-sunken p-4" role="status">
          <Info size={20} strokeWidth={1.75} aria-hidden="true" class="mt-0.5 shrink-0" />
          <p data-testid="past-hint">{de.form.pastHint(pastCount)}</p>
        </div>
      {/if}
    {/if}
  </section>

  <section aria-labelledby="sec-pay" class="flex flex-col gap-4">
    <SectionHeader id="sec-pay" title={f.repeat ? de.form.sectionPay : de.form.sectionMore} />
    <div class="grid grid-cols-2 gap-3">
      <TextField
        type="number"
        label={de.form.units}
        bind:value={f.units}
        min={0}
        max={20}
        inputmode="numeric"
      />
      <TextField label={de.form.pay} bind:value={f.pay} inputmode="decimal" error={payError} />
    </div>
    {#if f.repeat}
      <TextField
        type="number"
        label={de.form.alarmOffset}
        help={de.form.alarmOffsetHelp}
        bind:value={f.alarmOffsetMin}
        min={0}
        max={600}
        inputmode="numeric"
      />
      <fieldset>
        <legend class="mb-2 text-sm font-semibold">{de.form.color}</legend>
        <div class="flex flex-wrap gap-2">
          {#each COLORS as c, i (c)}
            <label
              class="relative flex size-12 cursor-pointer items-center justify-center rounded-full has-checked:ring-2 has-checked:ring-fg has-checked:ring-offset-2 has-checked:ring-offset-bg has-focus-visible:outline-3 has-focus-visible:outline-offset-4 has-focus-visible:outline-focus-outer"
              style:background={c}
            >
              <input
                type="radio"
                class="sr-only"
                name="color"
                value={c}
                bind:group={f.color}
                aria-label={de.form.colors[i] ?? c}
              />
            </label>
          {/each}
        </div>
      </fieldset>
    {:else}
      <Select
        label={de.form.kind}
        bind:value={f.kind}
        options={SESSION_KINDS.map((k) => ({ value: k, label: de.kind[k] }))}
      />
      <TextField label={de.form.note} bind:value={f.note} maxlength={500} />
    {/if}
  </section>

  {#if error}<p class="font-medium text-danger" role="alert">{error}</p>{/if}

  <div
    class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 flex gap-3 border-t-hl border-line bg-surface px-4 py-3 md:static md:border-0 md:bg-transparent md:p-0"
  >
    <Button type="submit" size="lg" class="flex-1 md:flex-none md:px-10" loading={busy}
      >{de.common.save}</Button
    >
    <Button href={editId ? '/trainings' : '/'} variant="ghost" size="lg">{de.common.cancel}</Button>
  </div>
</form>
