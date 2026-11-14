<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Android only: permission checklist + test alarm (§5 "Alarm-Einrichtung"). -->
<script lang="ts">
  import { formatDateDe, toLocal, type AlarmEntry } from '@ult/shared';
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
          ['notifications', de.alarmSetup.notifications, status.notifications],
          ['fullScreen', de.alarmSetup.fullScreen, status.fullScreen],
          ['exactAlarms', de.alarmSetup.exactAlarms, status.exactAlarms],
          ['battery', de.alarmSetup.battery, status.batteryOptimizationIgnored],
        ] as [SettingKind, string, boolean][])
      : [],
  );
</script>

<h1 class="h1">{de.alarmSetup.title}</h1>
{#if !isNative()}
  <p class="card">{de.alarmSetup.onlyAndroid}</p>
{:else if status}
  <p class="mb-4 text-ink-muted">{de.alarmSetup.intro}</p>
  <ul class="card mb-4 flex flex-col divide-y divide-line p-0">
    {#each rows as [kind, label, ok] (kind)}
      <li class="flex items-center gap-3 px-4 py-2">
        <span class="text-2xl {ok ? 'text-status-held' : 'text-status-not-held'}" aria-hidden="true"
          >{ok ? '✔' : '✖'}</span
        >
        <span class="flex-1">{label}<span class="sr-only">: {ok ? 'ok' : 'fehlt'}</span></span>
        {#if !ok}<button class="btn-secondary" onclick={() => fix(kind)}>{de.alarmSetup.open}</button>{/if}
      </li>
    {/each}
    <li class="flex items-center gap-3 px-4 py-2">
      <span
        class="text-2xl {app.me?.device?.isAlarmDevice ? 'text-status-held' : 'text-status-not-held'}"
        aria-hidden="true">{app.me?.device?.isAlarmDevice ? '✔' : '✖'}</span
      >
      <span class="flex-1">{de.alarmSetup.alarmDevice}</span>
      {#if !app.me?.device?.isAlarmDevice}<a class="btn-secondary" href="/geraete">{de.nav.devices}</a>{/if}
    </li>
  </ul>
  <p class="mb-4 text-sm">
    <button class="text-brand-700 underline" onclick={() => fix('dontkillmyapp')}
      >{de.alarmSetup.manufacturer}</button
    >
  </p>
  <div class="mb-4 flex flex-wrap gap-2">
    <button class="btn-primary" onclick={test}>{de.alarmSetup.test}</button>
    <button class="btn-secondary" onclick={sync}>{de.alarmSetup.sync}</button>
  </div>
  <section class="card">
    <h2 class="h2">{de.alarmSetup.nextAlarms}</h2>
    {#if scheduled.length === 0}
      <p class="text-ink-muted">{de.alarmSetup.noAlarms}</p>
    {:else}
      <ul class="text-sm">
        {#each scheduled as a (a.key)}
          {@const local = toLocal(new Date(a.triggerAt))}
          <li>{formatDateDe(local.date)}, {local.time} – {a.title}</li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}
