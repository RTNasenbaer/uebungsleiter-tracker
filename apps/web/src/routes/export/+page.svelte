<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import {
    aggregateReport,
    findDuplicates,
    systemClock,
    todayIn,
    type SessionDto,
    type SettingsDto,
  } from '@ult/shared';
  import { api } from '$lib/api';
  import { buildCsv } from '$lib/export/csv';
  import { type ImportPreview, readImportFile } from '$lib/export/importFile';
  import { buildReportPdf } from '$lib/export/pdf';
  import { buildXlsx } from '$lib/export/xlsx';
  import { de } from '$lib/i18n/de';
  import { saveFile } from '$lib/native/files';
  import { app, bumpRevision, toast } from '$lib/state.svelte';

  const currentYear = Number(todayIn(systemClock).slice(0, 4));
  let year = $state(currentYear);
  let includePlanned = $state(false);
  let detailPage = $state(false);
  let sessions = $state<SessionDto[]>([]);
  let settings = $state<SettingsDto | null>(null);
  let busy = $state(false);

  let preview = $state<ImportPreview | null>(null);
  let duplicates = $state<boolean[]>([]);
  let onDuplicate = $state<'skip' | 'overwrite'>('skip');

  const report = $derived(aggregateReport(sessions, year, { includePlanned }));
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  $effect(() => {
    void app.revision;
    const y = year;
    Promise.all([api.sessions(`${y}-01-01`, `${y}-12-31`), api.settings()])
      .then(([s, cfg]) => {
        sessions = s;
        settings = cfg;
      })
      .catch((e) => toast((e as Error).message, 'error'));
  });

  async function guarded(fn: () => Promise<void>) {
    busy = true;
    try {
      await fn();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      busy = false;
    }
  }

  const downloadPdf = () =>
    guarded(async () => {
      const bytes = await buildReportPdf({
        report,
        settings: settings!,
        sessions,
        detailPage,
        includePlanned,
      });
      await saveFile(`Uebungsleiternachweis_${year}.pdf`, bytes, 'application/pdf');
    });
  const downloadCsv = () =>
    guarded(() => saveFile(`Termine_${year}.csv`, buildCsv(sessions), 'text/csv;charset=utf-8'));
  const downloadXlsx = () =>
    guarded(async () =>
      saveFile(
        `Termine_${year}.xlsx`,
        await buildXlsx(sessions, report),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ),
    );
  const downloadJson = () =>
    guarded(async () => {
      const backup = await api.backup();
      await saveFile(
        `uebungsleiter-backup_${todayIn(systemClock)}.json`,
        JSON.stringify(backup, null, 2),
        'application/json',
      );
    });

  async function onFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    await guarded(async () => {
      preview = await readImportFile(file);
      if (preview.kind === 'sessions' && preview.valid.length) {
        const dates = preview.valid.map((s) => s.date).sort();
        const existing = await api.sessions(dates[0]!, dates.at(-1)!);
        duplicates = findDuplicates(preview.valid, existing);
      } else duplicates = [];
    });
  }

  const runImport = () =>
    guarded(async () => {
      if (!preview) return;
      if (preview.kind === 'backup') {
        await api.restore(preview.backup);
        toast(de.export.restoreDone);
      } else {
        const r = await api.importSessions(preview.valid, onDuplicate);
        toast(de.export.importDone(r.created, r.updated, r.skipped));
      }
      preview = null;
      bumpRevision();
    });
</script>

<h1 class="h1">{de.export.title}</h1>

<section class="card mb-4" aria-labelledby="report-h">
  <h2 id="report-h" class="h2">{de.export.report}</h2>
  <div class="mb-3 flex flex-wrap items-end gap-4">
    <label>
      <span class="label">{de.export.year}</span>
      <select class="input w-32" bind:value={year}>
        {#each years as y (y)}<option value={y}>{y}</option>{/each}
      </select>
    </label>
    <label class="flex min-h-touch items-center gap-2">
      <input type="checkbox" class="size-5" bind:checked={includePlanned} />
      {de.export.includePlanned}
    </label>
    <label class="flex min-h-touch items-center gap-2">
      <input type="checkbox" class="size-5" bind:checked={detailPage} />
      {de.export.detailPage}
    </label>
  </div>
  {#if !includePlanned}
    <p class="mb-3 text-sm text-ink-muted">{de.export.includePlannedHint}</p>
  {/if}

  <h3 class="mb-2 font-semibold">{de.export.preview}</h3>
  <div class="mb-4 overflow-x-auto">
    <table class="w-full border-collapse text-sm" data-testid="report-preview">
      <thead>
        <tr class="bg-surface-muted">
          <th class="border border-line p-2 text-left">Monat Kalenderjahr {year}</th>
          <th class="border border-line p-2 text-left">Trainingsgruppe(n)</th>
          <th class="border border-line p-2">Trainingseinheiten (90–120 Minuten) pro Monat</th>
        </tr>
      </thead>
      <tbody>
        {#each report.months as m (m.month)}
          <tr>
            <td class="border border-line p-2">{m.name}</td>
            <td class="border border-line p-2">{m.teams.join(', ')}</td>
            <td class="border border-line p-2 text-center">{m.units || ''}</td>
          </tr>
        {/each}
        <tr class="font-bold">
          <td class="border border-line p-2"></td>
          <td class="border border-line p-2 text-right">Summe:</td>
          <td class="border border-line p-2 text-center" data-testid="report-total">{report.totalUnits}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <button class="btn-primary" onclick={downloadPdf} disabled={busy || !settings}>{de.export.download}</button>
</section>

<section class="card mb-4" aria-labelledby="data-h">
  <h2 id="data-h" class="h2">{de.export.data} ({year})</h2>
  <div class="flex flex-wrap gap-2">
    <button class="btn-secondary" onclick={downloadCsv} disabled={busy}>{de.export.csv}</button>
    <button class="btn-secondary" onclick={downloadXlsx} disabled={busy}>{de.export.xlsx}</button>
    <button class="btn-secondary" onclick={downloadJson} disabled={busy}>{de.export.json}</button>
  </div>
</section>

<section class="card" aria-labelledby="import-h">
  <h2 id="import-h" class="h2">{de.export.import}</h2>
  <label class="block">
    <span class="label">{de.export.importHint}</span>
    <input
      class="input py-2"
      type="file"
      accept=".csv,.xlsx,.json"
      onchange={onFile}
      data-testid="import-file"
    />
  </label>
  {#if preview?.kind === 'sessions'}
    {@const dupCount = duplicates.filter(Boolean).length}
    <p class="mt-3 font-medium" data-testid="import-summary">
      {de.export.importPreview(preview.valid.length - dupCount, dupCount, preview.errors.length)}
    </p>
    {#if preview.errors.length}
      <ul class="mt-2 max-h-32 overflow-y-auto text-sm text-red-700">
        {#each preview.errors as err (err.row)}<li>Zeile {err.row}: {err.error}</li>{/each}
      </ul>
    {/if}
    {#if dupCount > 0}
      <fieldset class="mt-3 flex flex-wrap items-center gap-3">
        <legend class="label">{de.export.duplicates}</legend>
        <label class="flex min-h-touch items-center gap-2"
          ><input type="radio" bind:group={onDuplicate} value="skip" /> {de.export.dupSkip}</label
        >
        <label class="flex min-h-touch items-center gap-2"
          ><input type="radio" bind:group={onDuplicate} value="overwrite" /> {de.export.dupOverwrite}</label
        >
      </fieldset>
    {/if}
    <button class="btn-primary mt-3" onclick={runImport} disabled={busy || preview.valid.length === 0}
      >{de.export.importButton}</button
    >
  {:else if preview?.kind === 'backup'}
    <p class="mt-3 font-medium">
      Backup vom {new Date(preview.backup.exportedAt).toLocaleString('de-DE')}: {preview.backup.series.length} Trainings,
      {preview.backup.sessions.length} Termine
    </p>
    <button class="btn-primary mt-3" onclick={runImport} disabled={busy}>{de.export.importButton}</button>
  {/if}
</section>
