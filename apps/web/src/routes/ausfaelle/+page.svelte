<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import { formatDateShortDe, type ExceptionDto, type SeriesDto } from '@ult/shared';
  import { api } from '$lib/api';
  import { type IcsRange, parseIcs } from '$lib/export/ics';
  import { de } from '$lib/i18n/de';
  import { app, bumpRevision, toast } from '$lib/state.svelte';

  let list = $state<ExceptionDto[]>([]);
  let series = $state<SeriesDto[]>([]);
  let f = $state({ label: '', fromDate: '', toDate: '', seriesId: '' });
  let ics = $state<IcsRange[] | null>(null);
  let busy = $state(false);

  $effect(() => {
    void app.revision;
    api.exceptions().then((e) => (list = e));
    api.series().then((s) => (series = s));
  });

  const seriesName = (id: string | null) => {
    if (!id) return de.exceptions.allSeries;
    const s = series.find((x) => x.id === id);
    return s ? [s.team, s.title].filter(Boolean).join(' ') : '?';
  };

  async function add(e: Event) {
    e.preventDefault();
    busy = true;
    try {
      await api.createException({
        label: f.label,
        fromDate: f.fromDate,
        toDate: f.toDate || f.fromDate,
        seriesId: f.seriesId || null,
      });
      f = { label: '', fromDate: '', toDate: '', seriesId: '' };
      toast(de.common.saved);
      bumpRevision();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      busy = false;
    }
  }

  async function remove(id: string) {
    await api.deleteException(id);
    bumpRevision();
  }

  async function onIcs(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      ics = parseIcs(await file.text());
    } catch {
      toast('Datei konnte nicht gelesen werden', 'error');
    }
  }

  async function importIcs() {
    if (!ics?.length) return;
    const res = await api.bulkExceptions(ics.map((r) => ({ ...r, seriesId: null })));
    toast(de.exceptions.imported(res.created, res.skipped));
    ics = null;
    bumpRevision();
  }
</script>

<h1 class="h1">{de.exceptions.title}</h1>
<p class="mb-4 text-ink-muted">{de.exceptions.intro}</p>

<form class="card mb-4 grid grid-cols-2 gap-3" onsubmit={add}>
  <h2 class="h2 col-span-2">{de.exceptions.add}</h2>
  <label class="col-span-2">
    <span class="label">{de.exceptions.label}</span>
    <input
      class="input"
      bind:value={f.label}
      placeholder={de.exceptions.labelPlaceholder}
      required
      maxlength="120"
    />
  </label>
  <label
    ><span class="label">{de.exceptions.from}</span><input
      class="input"
      type="date"
      bind:value={f.fromDate}
      required
    /></label
  >
  <label
    ><span class="label">{de.exceptions.to}</span><input
      class="input"
      type="date"
      bind:value={f.toDate}
      min={f.fromDate}
    /></label
  >
  <label class="col-span-2">
    <span class="label">{de.exceptions.series}</span>
    <select class="input" bind:value={f.seriesId}>
      <option value="">{de.exceptions.allSeries}</option>
      {#each series as s (s.id)}<option value={s.id}>{[s.team, s.title].filter(Boolean).join(' ')}</option
        >{/each}
    </select>
  </label>
  <button class="btn-primary col-span-2" disabled={busy}>{de.exceptions.add}</button>
</form>

<section class="card mb-4">
  <h2 class="h2">{de.exceptions.icsImport}</h2>
  <label class="block">
    <span class="label">{de.exceptions.icsHint}</span>
    <input class="input py-2" type="file" accept=".ics,text/calendar" onchange={onIcs} />
  </label>
  {#if ics}
    <p class="mt-3 font-medium">{de.exceptions.icsPreview(ics.length)}</p>
    <ul class="mt-2 max-h-48 overflow-y-auto text-sm">
      {#each ics as r, i (i)}<li>
          {formatDateShortDe(r.fromDate)} – {formatDateShortDe(r.toDate)}: {r.label}
        </li>{/each}
    </ul>
    <button class="btn-primary mt-3" onclick={importIcs} disabled={ics.length === 0}
      >{de.exceptions.icsImportButton}</button
    >
  {/if}
</section>

{#if list.length === 0}
  <p class="card text-ink-muted">{de.exceptions.none}</p>
{:else}
  <ul class="card flex flex-col divide-y divide-line p-0" data-testid="exception-list">
    {#each list as e (e.id)}
      <li class="flex items-center gap-3 px-4 py-2">
        <div class="flex-1">
          <p class="font-medium">{e.label}</p>
          <p class="text-sm text-ink-muted">
            {formatDateShortDe(e.fromDate)}{e.toDate !== e.fromDate
              ? ` – ${formatDateShortDe(e.toDate)}`
              : ''} · {seriesName(e.seriesId)}
          </p>
        </div>
        <button class="btn-secondary" onclick={() => remove(e.id)} aria-label="{de.common.delete}: {e.label}"
          >{de.common.delete}</button
        >
      </li>
    {/each}
  </ul>
{/if}
