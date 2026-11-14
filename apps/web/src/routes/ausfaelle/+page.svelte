<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import { formatDateShortDe, type ExceptionDto, type SeriesDto } from '@ult/shared';
  import { api } from '$lib/api';
  import { type IcsRange, parseIcs } from '$lib/export/ics';
  import CalendarOff from 'lucide-svelte/icons/calendar-off';
  import Trash2 from 'lucide-svelte/icons/trash-2';
  import Upload from 'lucide-svelte/icons/upload';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import IconButton from '$lib/components/ui/IconButton.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';
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
      toast(de.exceptions.readError, 'error');
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

<PageHeader label={de.exceptions.pageLabel} title={de.exceptions.title} />
<p class="-mt-3 mb-6 max-w-prose text-muted">{de.exceptions.intro}</p>

<div class="grid gap-8 lg:grid-cols-2">
  <div class="flex flex-col gap-8">
    <section aria-labelledby="add-h">
      <SectionHeader id="add-h" title={de.exceptions.add} />
      <Card>
        <form class="grid grid-cols-2 gap-4" onsubmit={add}>
          <TextField
            class="col-span-2"
            label={de.exceptions.label}
            bind:value={f.label}
            placeholder={de.exceptions.labelPlaceholder}
            required
            maxlength={120}
          />
          <TextField type="date" label={de.exceptions.from} bind:value={f.fromDate} required />
          <TextField type="date" label={de.exceptions.to} bind:value={f.toDate} min={f.fromDate} />
          <Select
            class="col-span-2"
            label={de.exceptions.series}
            bind:value={f.seriesId}
            options={[
              { value: '', label: de.exceptions.allSeries },
              ...series.map((s) => ({ value: s.id, label: [s.team, s.title].filter(Boolean).join(' ') })),
            ]}
          />
          <Button type="submit" class="col-span-2" loading={busy}>{de.exceptions.add}</Button>
        </form>
      </Card>
    </section>

    <section aria-labelledby="ics-h">
      <SectionHeader id="ics-h" title={de.exceptions.icsImport} />
      <Card class="flex flex-col gap-3">
        <label
          class="relative flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-line-strong p-4 text-center hover:bg-surface-sunken has-focus-visible:outline-3 has-focus-visible:outline-focus-outer"
        >
          <Upload size={24} strokeWidth={1.75} aria-hidden="true" />
          <span class="font-semibold">{de.exceptions.icsHint}</span>
          <input class="sr-only" type="file" accept=".ics,text/calendar" onchange={onIcs} />
        </label>
        {#if ics}
          <p class="font-semibold">{de.exceptions.icsPreview(ics.length)}</p>
          <ul class="max-h-48 overflow-y-auto rounded-sm bg-surface-sunken p-3 text-sm">
            {#each ics as r, i (i)}<li>
                {formatDateShortDe(r.fromDate)} – {formatDateShortDe(r.toDate)}: {r.label}
              </li>{/each}
          </ul>
          <Button onclick={importIcs} disabled={ics.length === 0}>{de.exceptions.icsImportButton}</Button>
        {/if}
      </Card>
    </section>
  </div>

  <section aria-labelledby="list-h">
    <SectionHeader id="list-h" title={de.exceptions.listTitle} count={list.length} />
    {#if list.length === 0}
      <Card><EmptyState text={de.exceptions.none} /></Card>
    {:else}
      <ul class="flex flex-col gap-2" data-testid="exception-list">
        {#each list as e (e.id)}
          <li class="flex items-center gap-3 rounded-md border-hl border-line bg-surface py-2 pr-2 pl-4">
            <CalendarOff size={20} strokeWidth={1.75} aria-hidden="true" class="shrink-0 text-muted" />
            <div class="min-w-0 flex-1">
              <p class="font-semibold">{e.label}</p>
              <p class="text-sm text-muted">
                {formatDateShortDe(e.fromDate)}{e.toDate !== e.fromDate
                  ? `–${formatDateShortDe(e.toDate)}`
                  : ''} · {seriesName(e.seriesId)}
              </p>
            </div>
            <IconButton icon={Trash2} label="{de.common.delete}: {e.label}" onclick={() => remove(e.id)} />
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>
