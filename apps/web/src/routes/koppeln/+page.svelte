<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, setNativeAuth } from '$lib/api';
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

<div class="mx-auto mt-6 max-w-md">
  <h1 class="h1">{de.pairing.title}</h1>
  {#if !isNative()}
    <div class="card flex flex-col gap-3">
      <p>{de.pairing.intro}</p>
      <p class="text-ink-muted">
        Diese Seite ist für die Android-App gedacht. Im Browser meldest du dich mit GitHub an.
      </p>
      <a class="btn-primary" href="/login">{de.login.title}</a>
    </div>
  {:else}
    <div class="card flex flex-col gap-4">
      <p>{de.pairing.intro}</p>
      {#if scanning}
        <video bind:this={video} class="aspect-square w-full rounded-lg bg-black object-cover" playsinline
        ></video>
        <button class="btn-secondary" onclick={() => (stopScan?.(), (scanning = false))}
          >{de.pairing.stopScan}</button
        >
      {:else}
        <button class="btn-primary" onclick={scan}>{de.pairing.scan}</button>
      {/if}
      <form class="flex flex-col gap-3" onsubmit={submit}>
        <label
          ><span class="label">{de.pairing.code}</span>
          <input
            class="input font-mono text-xl tracking-widest uppercase"
            bind:value={code}
            required
            minlength="8"
            maxlength="9"
            autocomplete="one-time-code"
          /></label
        >
        <label
          ><span class="label">{de.pairing.server}</span>
          <input
            class="input"
            type="url"
            bind:value={server}
            required
            placeholder="https://….workers.dev"
          /></label
        >
        <label
          ><span class="label">{de.pairing.deviceName}</span>
          <input class="input" bind:value={name} maxlength="60" /></label
        >
        <button class="btn-primary" disabled={busy}>{de.pairing.submit}</button>
      </form>
    </div>
  {/if}
  <p class="mt-6 text-center text-sm"><a class="underline" href="/ueber">{de.nav.about}</a></p>
</div>
