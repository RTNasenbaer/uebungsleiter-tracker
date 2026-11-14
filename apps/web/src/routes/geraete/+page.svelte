<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import QRCode from 'qrcode';
  import type { DeviceDto, PairingCodeDto } from '@ult/shared';
  import { api } from '$lib/api';
  import Modal from '$lib/components/Modal.svelte';
  import { de } from '$lib/i18n/de';
  import { app, bumpRevision, toast } from '$lib/state.svelte';

  let devices = $state<DeviceDto[]>([]);
  let pairing = $state<(PairingCodeDto & { qr: string }) | null>(null);
  let pairOpen = $state(false);
  let now = $state(Date.now());
  let removeTarget = $state<DeviceDto | null>(null);
  let removeOpen = $state(false);

  const androids = $derived(devices.filter((d) => d.platform === 'android'));
  const secondsLeft = $derived(
    pairing ? Math.max(0, Math.round((Date.parse(pairing.expiresAt) - now) / 1000)) : 0,
  );

  $effect(() => {
    void app.revision;
    api.devices().then((d) => (devices = d));
  });

  $effect(() => {
    if (!pairOpen) return;
    const id = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(id);
  });

  /** QR content: the app reads server + code from this URL; a normal camera just opens the hint page */
  function pairUrl(code: string) {
    return `${location.origin}/koppeln#server=${encodeURIComponent(location.origin)}&code=${code}`;
  }

  async function newCode() {
    try {
      const p = await api.pairingCode();
      pairing = { ...p, qr: await QRCode.toDataURL(pairUrl(p.code), { width: 260, margin: 1 }) };
      now = Date.now();
      pairOpen = true;
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function setAlarm(d: DeviceDto) {
    await api.updateDevice(d.id, { isAlarmDevice: true });
    toast(de.common.saved);
    bumpRevision();
  }

  async function remove() {
    if (!removeTarget) return;
    await api.deleteDevice(removeTarget.id);
    removeOpen = false;
    bumpRevision();
  }

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })
      : de.devices.never;
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
  <h1 class="h1 mb-0">{de.devices.title}</h1>
  {#if !app.native}<button class="btn-primary" onclick={newCode}>{de.devices.pair}</button>{/if}
</div>
<p class="mb-4 text-ink-muted">{de.devices.intro}</p>

<fieldset class="card mb-4">
  <legend class="sr-only">{de.devices.alarmDevice}</legend>
  {#if androids.length === 0}<p class="text-ink-muted">{de.devices.noAndroid}</p>{/if}
  <ul class="flex flex-col divide-y divide-line" data-testid="device-list">
    {#each devices as d (d.id)}
      <li class="flex flex-wrap items-center gap-3 py-2">
        {#if d.platform === 'android'}
          <label class="flex min-h-touch flex-1 items-center gap-3">
            <input
              type="radio"
              name="alarm"
              class="size-5"
              checked={d.isAlarmDevice}
              onchange={() => setAlarm(d)}
            />
            <span>
              <span class="font-medium">{d.name}</span>
              {#if d.isAlarmDevice}<span class="ml-1 rounded-full bg-brand-700 px-2 text-xs text-white"
                  >{de.devices.alarmDevice}</span
                >{/if}
              {#if d.isCurrent}<span class="ml-1 text-sm text-ink-muted">({de.devices.current})</span>{/if}
              <span class="block text-sm text-ink-muted"
                >Android{d.appVersion ? ` · App ${d.appVersion}` : ''} · {de.devices.lastSeen(
                  fmt(d.lastSeenAt),
                )}</span
              >
            </span>
          </label>
        {:else}
          <div class="flex min-h-touch flex-1 items-center gap-3 pl-8">
            <span>
              <span class="font-medium">{d.name}</span>
              {#if d.isCurrent}<span class="ml-1 text-sm text-ink-muted">({de.devices.current})</span>{/if}
              <span class="block text-sm text-ink-muted"
                >Browser · {de.devices.lastSeen(fmt(d.lastSeenAt))}</span
              >
            </span>
          </div>
        {/if}
        <button
          class="btn-secondary"
          onclick={() => ((removeTarget = d), (removeOpen = true))}
          aria-label="{de.devices.remove}: {d.name}">{de.devices.remove}</button
        >
      </li>
    {/each}
  </ul>
</fieldset>

<Modal bind:open={pairOpen} title={de.devices.pair}>
  {#if pairing}
    <div class="flex flex-col items-center gap-3 text-center" data-testid="pairing">
      <p>{de.devices.pairIntro}</p>
      {#if secondsLeft > 0}
        <img
          src={pairing.qr}
          alt="QR-Code zum Koppeln"
          width="260"
          height="260"
          class="rounded bg-white p-2"
        />
        <p class="font-mono text-3xl font-bold tracking-widest" data-testid="pairing-code">
          {`${pairing.code.slice(0, 4)} ${pairing.code.slice(4)}`}
        </p>
        <p class="text-sm text-ink-muted">{de.devices.pairValid(Math.ceil(secondsLeft / 60))}</p>
      {:else}
        <p class="text-red-700">{de.devices.pairExpired}</p>
      {/if}
      <button class="btn-secondary" onclick={newCode}>{de.devices.pairNew}</button>
    </div>
  {/if}
</Modal>

<Modal bind:open={removeOpen} title={de.devices.remove}>
  <p class="mb-4">{de.devices.removeConfirm}</p>
  <div class="flex gap-2">
    <button class="btn-danger flex-1" onclick={remove}>{de.devices.remove}</button>
    <button class="btn-secondary flex-1" onclick={() => (removeOpen = false)}>{de.common.cancel}</button>
  </div>
</Modal>
