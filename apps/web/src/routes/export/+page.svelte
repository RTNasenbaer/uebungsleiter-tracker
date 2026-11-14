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
  import Download from 'lucide-svelte/icons/download';
  import FileSpreadsheet from 'lucide-svelte/icons/file-spreadsheet';
  import FileText from 'lucide-svelte/icons/file-text';
  import Upload from 'lucide-svelte/icons/upload';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import FilterChips from '$lib/components/ui/FilterChips.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
  import Switch from '$lib/components/ui/Switch.svelte';
  import { de } from '$lib/i18n/de';
  import { saveFile } from '$lib/native/files';
  import { app, bumpRevision, toast } from '$lib/state.svelte';

  const currentYear = Number(todayIn(systemClock).slice(0, 4));
  let yearStr = $state(String(currentYear));
  const year = $derived(Number(yearStr));
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

<PageHeader label={de.export.label} title={de.export.title} />

<div class="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
  <section aria-labelledby="report-h" class="flex min-w-0 flex-col gap-4">
    <SectionHeader id="report-h" title={de.export.report} />
    <FilterChips
      legend={de.export.year}
      bind:value={yearStr}
      options={years.map((y) => ({ value: String(y), label: String(y) }))}
    />
    <Card class="flex flex-col gap-1 py-2 md:py-2">
      <Switch
        label={de.export.includePlanned}
        bind:checked={includePlanned}
        description={includePlanned ? undefined : de.export.includePlannedHint}
      />
      <div class="h-[var(--hl-size-line)] bg-line" aria-hidden="true"></div>
      <Switch label={de.export.detailPage} bind:checked={detailPage} />
    </Card>

    <!-- preview: a sheet of paper, also in dark mode -->
    <figure
      class="overflow-x-auto rounded-sm bg-paper p-5 text-on-paper shadow-float md:p-8"
      aria-labelledby="preview-cap"
    >
      <figcaption id="preview-cap" class="sr-only">{de.export.preview}</figcaption>
      <p class="mb-4 font-score text-2xl font-bold">{de.export.reportTitle(year)}</p>
      <table class="w-full border-collapse text-sm" data-testid="report-preview">
        <thead>
          <tr>
            <th class="border border-paper-line p-2 text-left font-semibold">Monat Kalenderjahr {year}</th>
            <th class="border border-paper-line p-2 text-left font-semibold">Trainingsgruppe(n)</th>
            <th class="border border-paper-line p-2 font-semibold"
              >Trainingseinheiten (90–120 Minuten) pro Monat</th
            >
          </tr>
        </thead>
        <tbody>
          {#each report.months as m (m.month)}
            <tr>
              <td class="border border-paper-line px-2 py-1.5">{m.name}</td>
              <td class="border border-paper-line px-2 py-1.5">{m.teams.join(', ')}</td>
              <td class="border border-paper-line px-2 py-1.5 text-center">{m.units || ''}</td>
            </tr>
          {/each}
          <tr class="font-bold">
            <td class="border border-paper-line p-2"></td>
            <td class="border border-paper-line p-2 text-right">Summe:</td>
            <td class="border border-paper-line p-2 text-center font-score text-lg" data-testid="report-total"
              >{report.totalUnits}</td
            >
          </tr>
        </tbody>
      </table>
    </figure>
    <div>
      <Button size="lg" onclick={downloadPdf} loading={busy} disabled={!settings}>
        <FileText size={20} strokeWidth={1.75} aria-hidden="true" />{de.export.download}</Button
      >
    </div>
  </section>

  <div class="flex min-w-0 flex-col gap-8">
    <section aria-labelledby="data-h">
      <SectionHeader id="data-h" title="{de.export.data} {year}" />
      <div class="flex flex-wrap gap-2">
        <Button variant="secondary" onclick={downloadCsv} disabled={busy} aria-label={de.export.csv}>
          <Download size={18} strokeWidth={1.75} aria-hidden="true" />{de.export.csvShort}</Button
        >
        <Button variant="secondary" onclick={downloadXlsx} disabled={busy} aria-label={de.export.xlsx}>
          <FileSpreadsheet size={18} strokeWidth={1.75} aria-hidden="true" />{de.export.xlsxShort}</Button
        >
        <Button variant="secondary" onclick={downloadJson} disabled={busy} aria-label={de.export.json}>
          <Download size={18} strokeWidth={1.75} aria-hidden="true" />{de.export.jsonShort}</Button
        >
      </div>
    </section>

    <section aria-labelledby="import-h" class="flex flex-col gap-3">
      <SectionHeader id="import-h" title={de.export.import} />
      <label
        class="relative flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-line-strong bg-surface p-4 text-center hover:bg-surface-sunken has-focus-visible:outline-3 has-focus-visible:outline-focus-outer"
      >
        <Upload size={24} strokeWidth={1.75} aria-hidden="true" />
        <span class="font-semibold">{de.export.chooseFile}</span>
        <span class="text-sm text-muted">{de.export.importHint}</span>
        <input
          class="sr-only"
          type="file"
          accept=".csv,.xlsx,.json"
          onchange={onFile}
          data-testid="import-file"
        />
      </label>
      {#if preview?.kind === 'sessions'}
        {@const dupCount = duplicates.filter(Boolean).length}
        <Card class="flex flex-col gap-3">
          <p class="font-semibold" data-testid="import-summary">
            {de.export.importPreview(preview.valid.length - dupCount, dupCount, preview.errors.length)}
          </p>
          {#if preview.errors.length}
            <ul class="max-h-32 overflow-y-auto text-sm text-danger">
              {#each preview.errors as err (err.row)}<li>{de.export.rowError(err.row, err.error)}</li>{/each}
            </ul>
          {/if}
          {#if dupCount > 0}
            <SegmentedControl
              legend={de.export.duplicates}
              bind:value={onDuplicate}
              options={[
                { value: 'skip', label: de.export.dupSkip },
                { value: 'overwrite', label: de.export.dupOverwrite },
              ]}
            />
          {/if}
          <Button onclick={runImport} loading={busy} disabled={preview.valid.length === 0}
            >{de.export.importButton}</Button
          >
        </Card>
      {:else if preview?.kind === 'backup'}
        <Card class="flex flex-col gap-3">
          <p class="font-semibold">
            {de.export.backupInfo(
              new Date(preview.backup.exportedAt).toLocaleString('de-DE'),
              preview.backup.series.length,
              preview.backup.sessions.length,
            )}
          </p>
          <Button onclick={runImport} loading={busy}>{de.export.importButton}</Button>
        </Card>
      {/if}
    </section>
  </div>
</div>
