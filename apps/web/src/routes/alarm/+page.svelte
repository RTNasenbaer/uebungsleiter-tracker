<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Android only: permission checklist + test alarm (§5 "Alarm-Einrichtung"). -->
<script lang="ts">
  import { formatDateDe, toLocal, type AlarmEntry } from '@ult/shared';
  import BellRing from 'lucide-svelte/icons/bell-ring';
  import Check from 'lucide-svelte/icons/check';
  import ExternalLink from 'lucide-svelte/icons/external-link';
  import RefreshCw from 'lucide-svelte/icons/refresh-cw';
  import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import { de } from '$lib/i18n/de';
  import { isNative } from '$lib/native/platform';
  import { syncAlarms } from '$lib/native/sync';
  import { type AlarmStatus, type SettingKind, TrainingAlarm } from '$lib/native/trainingAlarm';
  import { app, toast } from '$lib/state.svelte';

  let status = $state<AlarmStatus | null>(null);
  let scheduled = $state<AlarmEntry[]>([]);

  async function refresh() {
    status = await TrainingAlarm.getStatus();
    scheduled = (await TrainingAlarm.getScheduled()).alarms;
  }

  $effect(() => {
    if (!isNative()) return;
    refresh();
    // coming back from a system settings screen
    const onVis = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  });

  async function fix(kind: SettingKind) {
    if (kind === 'notifications') {
      const { granted } = await TrainingAlarm.requestNotificationPermission();
      if (!granted) await TrainingAlarm.openSetting({ kind });
    } else await TrainingAlarm.openSetting({ kind });
    setTimeout(refresh, 500);
  }

  async function test() {
    await TrainingAlarm.testAlarm({ delaySeconds: 60 });
    toast(de.alarmSetup.testScheduled);
  }

  async function sync() {
    try {
      await syncAlarms();
      await refresh();
      toast(de.common.saved);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  const rows = $derived(
    status
      ? ([
          [
            'notifications',
            de.alarmSetup.notifications,
            de.alarmSetup.hints.notifications,
            status.notifications,
          ],
          ['fullScreen', de.alarmSetup.fullScreen, de.alarmSetup.hints.fullScreen, status.fullScreen],
          ['exactAlarms', de.alarmSetup.exactAlarms, de.alarmSetup.hints.exactAlarms, status.exactAlarms],
          ['battery', de.alarmSetup.battery, de.alarmSetup.hints.battery, status.batteryOptimizationIgnored],
        ] as [SettingKind, string, string, boolean][])
      : [],
  );
</script>

{#snippet statusIcon(ok: boolean)}
  <span
    class="flex size-9 shrink-0 items-center justify-center rounded-full {ok
      ? 'bg-held text-on-primary'
      : 'bg-pending text-on-pending'}"
  >
    {#if ok}<Check size={20} strokeWidth={2.5} aria-hidden="true" />{:else}<TriangleAlert
        size={18}
        strokeWidth={2}
        aria-hidden="true"
      />{/if}
    <span class="sr-only">{ok ? de.alarmSetup.ok : de.alarmSetup.missing}</span>
  </span>
{/snippet}

<PageHeader label={de.alarmSetup.label} title={de.alarmSetup.title} />

{#if !isNative()}
  <Card><EmptyState text={de.alarmSetup.onlyAndroid} /></Card>
{:else if !status}
  <Skeleton rows={4} />
{:else}
  <p class="-mt-3 mb-6 max-w-prose text-muted">{de.alarmSetup.intro}</p>
  <ul class="mb-4 flex max-w-form flex-col gap-2">
    {#each rows as [kind, label, hint, ok] (kind)}
      <li class="flex items-center gap-3 rounded-md border-hl border-line bg-surface p-3">
        {@render statusIcon(ok)}
        <span class="min-w-0 flex-1">
          <span class="block font-semibold">{label}</span>
          <span class="block text-sm text-muted">{hint}</span>
        </span>
        {#if !ok}<Button variant="secondary" size="sm" class="min-h-12" onclick={() => fix(kind)}
            >{de.alarmSetup.open}</Button
          >{/if}
      </li>
    {/each}
    <li class="flex items-center gap-3 rounded-md border-hl border-line bg-surface p-3">
      {@render statusIcon(!!app.me?.device?.isAlarmDevice)}
      <span class="min-w-0 flex-1">
        <span class="block font-semibold">{de.alarmSetup.alarmDevice}</span>
        <span class="block text-sm text-muted">{de.alarmSetup.hints.alarmDevice}</span>
      </span>
      {#if !app.me?.device?.isAlarmDevice}<Button
          variant="secondary"
          size="sm"
          class="min-h-12"
          href="/geraete">{de.alarmSetup.open}</Button
        >{/if}
    </li>
  </ul>
  <button
    type="button"
    class="mb-8 inline-flex min-h-12 max-w-form cursor-pointer items-center gap-2 text-left text-sm font-semibold text-link underline underline-offset-4"
    onclick={() => fix('dontkillmyapp')}
  >
    <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" class="shrink-0" />{de.alarmSetup
      .manufacturer}
  </button>

  <section aria-labelledby="next-alarms-h" class="mb-8 max-w-form">
    <SectionHeader id="next-alarms-h" title={de.alarmSetup.nextAlarms} count={scheduled.length}>
      {#snippet actions()}
        <Button variant="ghost" size="sm" class="min-h-12" onclick={sync}>
          <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />{de.alarmSetup.sync}</Button
        >
      {/snippet}
    </SectionHeader>
    {#if scheduled.length === 0}
      <p class="text-muted">{de.alarmSetup.noAlarms}</p>
    {:else}
      <ul class="flex flex-col divide-y divide-line rounded-md border-hl border-line bg-surface">
        {#each scheduled as a (a.key)}
          {@const local = toLocal(new Date(a.triggerAt))}
          <li class="flex items-baseline gap-3 px-4 py-2.5">
            <span class="font-score text-lg font-semibold whitespace-nowrap"
              >{formatDateDe(local.date)}, {local.time}</span
            >
            <span class="min-w-0 truncate text-sm text-muted">{a.title}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <div class="max-w-form">
    <Button size="xl" full onclick={test}>
      <BellRing size={24} strokeWidth={1.75} aria-hidden="true" />{de.alarmSetup.test}</Button
    >
  </div>
{/if}
