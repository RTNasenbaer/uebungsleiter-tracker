<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import QRCode from 'qrcode';
  import type { DeviceDto, PairingCodeDto } from '@ult/shared';
  import { api } from '$lib/api';
  import Bell from 'lucide-svelte/icons/bell';
  import Monitor from 'lucide-svelte/icons/monitor';
  import QrCode from 'lucide-svelte/icons/qr-code';
  import Smartphone from 'lucide-svelte/icons/smartphone';
  import Trash2 from 'lucide-svelte/icons/trash-2';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import IconButton from '$lib/components/ui/IconButton.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
  import { de } from '$lib/i18n/de';
  import { app, bumpRevision, toast } from '$lib/state.svelte';

  let devices = $state<DeviceDto[]>([]);
  let pairing = $state<(PairingCodeDto & { qr: string }) | null>(null);
  let pairOpen = $state(false);
  let now = $state(Date.now());
  let removeTarget = $state<DeviceDto | null>(null);
  let removeOpen = $state(false);

  const androids = $derived(devices.filter((d) => d.platform === 'android'));
  const browsers = $derived(devices.filter((d) => d.platform !== 'android'));
  let busy = $state(false);
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
    busy = true;
    try {
      const p = await api.pairingCode();
      pairing = { ...p, qr: await QRCode.toDataURL(pairUrl(p.code), { width: 280, margin: 1 }) };
      now = Date.now();
      pairOpen = true;
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      busy = false;
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

<PageHeader label={de.devices.label} title={de.devices.title}>
  {#snippet actions()}
    {#if !app.native}
      <Button onclick={newCode} loading={busy && !pairOpen}>
        <QrCode size={20} strokeWidth={1.75} aria-hidden="true" />{de.devices.pair}</Button
      >
    {/if}
  {/snippet}
</PageHeader>
<p class="-mt-3 mb-6 max-w-prose text-muted">{de.devices.intro}</p>

<div data-testid="device-list" class="flex flex-col gap-8">
  <section aria-labelledby="android-h">
    <SectionHeader id="android-h" title={de.devices.android} count={androids.length} />
    {#if androids.length === 0}
      <Card>
        <EmptyState text={de.devices.noAndroid} />
      </Card>
    {:else}
      <fieldset aria-label={de.devices.alarmDevice}>
        <ul class="flex flex-col gap-2">
          {#each androids as d (d.id)}
            <li
              class="flex items-center gap-2 rounded-md border-hl bg-surface py-1 pr-2 pl-3 {d.isAlarmDevice
                ? 'border-primary'
                : 'border-line'}"
            >
              <label class="flex min-h-16 min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="alarm"
                  class="size-5 shrink-0 cursor-pointer accent-[var(--hl-primary)]"
                  checked={d.isAlarmDevice}
                  onchange={() => setAlarm(d)}
                />
                <span
                  class="flex size-10 shrink-0 items-center justify-center rounded-full {d.isAlarmDevice
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-sunken'}"
                  aria-hidden="true"
                >
                  {#if d.isAlarmDevice}<Bell size={20} strokeWidth={1.75} />{:else}<Smartphone
                      size={20}
                      strokeWidth={1.75}
                    />{/if}
                </span>
                <span class="min-w-0">
                  <span class="block truncate font-semibold">
                    {d.name}{#if d.isCurrent}<span class="font-normal text-muted">
                        ({de.devices.current})</span
                      >{/if}
                  </span>
                  {#if d.isAlarmDevice}<span class="block text-sm font-semibold"
                      >{de.devices.alarmDevice}</span
                    >{/if}
                  <span class="block text-sm text-muted"
                    >Android{d.appVersion ? ` · App ${d.appVersion}` : ''} · {de.devices.lastSeen(
                      fmt(d.lastSeenAt),
                    )}</span
                  >
                </span>
              </label>
              <IconButton
                icon={Trash2}
                label="{de.devices.remove}: {d.name}"
                onclick={() => ((removeTarget = d), (removeOpen = true))}
              />
            </li>
          {/each}
        </ul>
      </fieldset>
    {/if}
  </section>

  {#if browsers.length}
    <section aria-labelledby="browser-h">
      <SectionHeader id="browser-h" title={de.devices.browsers} count={browsers.length} />
      <ul class="flex flex-col gap-2">
        {#each browsers as d (d.id)}
          <li class="flex items-center gap-3 rounded-md border-hl border-line bg-surface py-1 pr-2 pl-3">
            <span
              class="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken"
              aria-hidden="true"><Monitor size={20} strokeWidth={1.75} /></span
            >
            <span class="flex min-h-16 min-w-0 flex-1 flex-col justify-center">
              <span class="truncate font-semibold">
                {d.name}{#if d.isCurrent}<span class="font-normal text-muted">
                    ({de.devices.current})</span
                  >{/if}
              </span>
              <span class="text-sm text-muted">{de.devices.lastSeen(fmt(d.lastSeenAt))}</span>
            </span>
            <IconButton
              icon={Trash2}
              label="{de.devices.remove}: {d.name}"
              onclick={() => ((removeTarget = d), (removeOpen = true))}
            />
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>

<Dialog bind:open={pairOpen} title={de.devices.pair}>
  {#if pairing}
    <div class="flex flex-col items-center gap-4 text-center" data-testid="pairing">
      <p class="max-w-sm text-muted">{de.devices.pairIntro}</p>
      {#if secondsLeft > 0}
        <div class="rounded-md bg-qr-bg p-3">
          <img
            src={pairing.qr}
            alt={de.devices.qrAlt}
            width="280"
            height="280"
            class="block size-64 sm:size-70"
          />
        </div>
        <p class="label-caps">{de.devices.codeLabel}</p>
        <p class="-mt-3 font-score text-display font-bold tracking-[0.12em]" data-testid="pairing-code">
          {`${pairing.code.slice(0, 4)} ${pairing.code.slice(4)}`}
        </p>
        <p class="text-sm text-muted" aria-live="polite">
          {de.devices.pairValid(Math.ceil(secondsLeft / 60))}
        </p>
      {:else}
        <p class="font-medium text-danger" role="alert">{de.devices.pairExpired}</p>
      {/if}
      <Button variant="secondary" loading={busy} onclick={newCode}>{de.devices.pairNew}</Button>
    </div>
  {/if}
</Dialog>

<Dialog bind:open={removeOpen} title={de.devices.removeTitle}>
  <p class="mb-5">
    <strong>{removeTarget?.name}</strong>: {de.devices.removeConfirm}
  </p>
  <div class="flex flex-wrap gap-2">
    <Button variant="danger" class="flex-1" onclick={remove}>{de.devices.remove}</Button>
    <Button variant="secondary" class="flex-1" onclick={() => (removeOpen = false)}>{de.common.cancel}</Button
    >
  </div>
</Dialog>
