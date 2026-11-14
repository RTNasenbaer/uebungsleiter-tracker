<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, setNativeAuth } from '$lib/api';
  import QrCode from 'lucide-svelte/icons/qr-code';
  import Logo from '$lib/components/brand/Logo.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';
  import { de } from '$lib/i18n/de';
  import { isNative } from '$lib/native/platform';
  import { syncAlarms } from '$lib/native/sync';
  import { TrainingAlarm } from '$lib/native/trainingAlarm';
  import { app, refreshMe, toast } from '$lib/state.svelte';

  const DEFAULT_SERVER = import.meta.env.VITE_DEFAULT_SERVER_URL ?? '';
  let server = $state(DEFAULT_SERVER);
  let code = $state('');
  let name = $state('Android-Handy');
  let busy = $state(false);
  let scanning = $state(false);
  let video: HTMLVideoElement | undefined = $state();
  let stopScan: (() => void) | null = null;

  function applyPairUrl(text: string): boolean {
    try {
      const url = new URL(text);
      const params = new URLSearchParams(url.hash.slice(1));
      const c = params.get('code');
      if (!c) return false;
      server = params.get('server') ?? url.origin;
      code = c;
      return true;
    } catch {
      return false;
    }
  }

  $effect(() => {
    applyPairUrl(location.href);
    return () => stopScan?.();
  });

  async function scan() {
    scanning = true;
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
        if (result && applyPairUrl(result.getText())) {
          controls.stop();
          scanning = false;
          submit();
        }
      });
      stopScan = () => controls.stop();
    } catch {
      scanning = false;
      toast(de.pairing.cameraError, 'error');
    }
  }

  async function submit(e?: Event) {
    e?.preventDefault();
    busy = true;
    try {
      const baseUrl = server.trim().replace(/\/$/, '');
      const res = await api.pair(baseUrl, code, name.trim() || 'Android-Handy');
      const auth = { token: res.token, baseUrl, deviceId: res.deviceId };
      await TrainingAlarm.setAuth(auth);
      setNativeAuth(auth);
      await refreshMe();
      await syncAlarms().catch(() => {});
      toast(de.pairing.success);
      goto(app.native ? '/alarm' : '/');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      busy = false;
    }
  }
</script>

<div class="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-sm flex-col justify-center py-8">
  <div class="mb-6 flex items-center gap-3">
    <Logo size={44} />
    <div>
      <p class="label-caps">{de.appName}</p>
      <h1 class="font-score text-3xl font-bold">{de.pairing.title}</h1>
    </div>
  </div>
  <div class="flex flex-col gap-4 rounded-md border-hl border-line bg-surface p-5">
    <p>{de.pairing.intro}</p>
    {#if !isNative()}
      <p class="text-muted">{de.pairing.browserHint}</p>
      <Button href="/login" full>{de.login.title}</Button>
    {:else}
      {#if scanning}
        <video bind:this={video} class="aspect-square w-full rounded-md bg-alarm-bg object-cover" playsinline
        ></video>
        <Button variant="secondary" full onclick={() => (stopScan?.(), (scanning = false))}
          >{de.pairing.stopScan}</Button
        >
      {:else}
        <Button size="lg" full onclick={scan}
          ><QrCode size={22} strokeWidth={1.75} aria-hidden="true" />{de.pairing.scan}</Button
        >
      {/if}
      <div class="flex items-center gap-3 text-sm text-muted" aria-hidden="true">
        <span class="h-[var(--hl-size-line)] flex-1 bg-line"></span>{de.pairing.or}<span
          class="h-[var(--hl-size-line)] flex-1 bg-line"
        ></span>
      </div>
      <form class="flex flex-col gap-4" onsubmit={submit}>
        <TextField
          label={de.pairing.code}
          bind:value={code}
          required
          minlength={8}
          maxlength={9}
          autocomplete="one-time-code"
          autocapitalize="characters"
          spellcheck={false}
          inputClass="font-score text-2xl tracking-[0.15em] uppercase"
        />
        <TextField
          type="url"
          label={de.pairing.server}
          bind:value={server}
          required
          placeholder="https://….workers.dev"
        />
        <TextField label={de.pairing.deviceName} bind:value={name} maxlength={60} />
        <Button type="submit" size="lg" full loading={busy}>{de.pairing.submit}</Button>
      </form>
    {/if}
  </div>
  <p class="mt-4 text-center text-sm">
    <a class="inline-flex min-h-12 items-center underline underline-offset-4" href="/ueber">{de.nav.about}</a>
  </p>
</div>
