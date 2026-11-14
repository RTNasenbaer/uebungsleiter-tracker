<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import { centsToEuroString, parseEuroToCents, type SettingsDto } from '@ult/shared';
  import { api } from '$lib/api';
  import { de } from '$lib/i18n/de';
  import { bumpRevision, toast } from '$lib/state.svelte';

  let s = $state<SettingsDto | null>(null);
  let pay = $state('');
  let limit = $state('');
  let deadline = $state('');
  let autoConfirm = $state('');
  let busy = $state(false);

  $effect(() => {
    api.settings().then((x) => {
      s = x;
      pay = centsToEuroString(x.defaultPayCents);
      limit = centsToEuroString(x.taxFreeLimitCents);
      const [m, d] = x.reportDeadline.split('-');
      deadline = `${d}.${m}.`;
      autoConfirm = x.autoConfirmAfterHours ? String(x.autoConfirmAfterHours) : '';
    });
  });

  async function save(e: Event) {
    e.preventDefault();
    if (!s) return;
    const defaultPayCents = parseEuroToCents(pay);
    const taxFreeLimitCents = parseEuroToCents(limit);
    const dm = /^(\d{1,2})\.(\d{1,2})\.?$/.exec(deadline.trim());
    if (defaultPayCents === null || taxFreeLimitCents === null) return toast(de.form.invalidPay, 'error');
    if (!dm) return toast('Frist bitte als TT.MM. eingeben', 'error');
    busy = true;
    try {
      s = await api.saveSettings({
        displayName: s.displayName,
        iban: s.iban.replace(/\s+/g, ' ').trim(),
        clubName: s.clubName,
        reportIntroTemplate: s.reportIntroTemplate,
        reportRecipient: s.reportRecipient,
        reportDeadline: `${dm[2]!.padStart(2, '0')}-${dm[1]!.padStart(2, '0')}`,
        defaultPayCents,
        taxFreeLimitCents,
        autoConfirmAfterHours: autoConfirm ? Number(autoConfirm) : null,
        alarmVibrate: s.alarmVibrate,
        alarmRingSeconds: Number(s.alarmRingSeconds),
        snoozeMinutes: Number(s.snoozeMinutes),
        quietStart: s.quietStart || null,
        quietEnd: s.quietEnd || null,
      });
      toast(de.common.saved);
      bumpRevision();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      busy = false;
    }
  }
</script>

<h1 class="h1">{de.settings.title}</h1>

{#if s}
  <form class="flex flex-col gap-4" onsubmit={save}>
    <section class="card grid gap-3 md:grid-cols-2">
      <h2 class="h2 md:col-span-2">{de.settings.profile}</h2>
      <label
        ><span class="label">{de.settings.displayName}</span><input
          class="input"
          bind:value={s.displayName}
          maxlength="120"
          autocomplete="name"
        /></label
      >
      <label
        ><span class="label">{de.settings.clubName}</span><input
          class="input"
          bind:value={s.clubName}
          maxlength="120"
        /></label
      >
      <label class="md:col-span-2">
        <span class="label">{de.settings.iban}</span>
        <input class="input font-mono" bind:value={s.iban} maxlength="42" autocomplete="off" />
        <span class="mt-1 block text-sm text-ink-muted">{de.settings.ibanHint}</span>
      </label>
    </section>

    <section class="card grid gap-3 md:grid-cols-2">
      <h2 class="h2 md:col-span-2">{de.settings.report}</h2>
      <label
        ><span class="label">{de.settings.reportRecipient}</span><input
          class="input"
          type="email"
          bind:value={s.reportRecipient}
          maxlength="200"
        /></label
      >
      <label
        ><span class="label">{de.settings.reportDeadline}</span><input
          class="input"
          bind:value={deadline}
          placeholder="15.12."
        /></label
      >
      <label class="md:col-span-2">
        <span class="label">{de.settings.reportIntro}</span>
        <textarea class="input min-h-32 py-2" bind:value={s.reportIntroTemplate} maxlength="2000"></textarea>
        <span class="mt-1 block text-sm text-ink-muted">{de.settings.reportIntroHint}</span>
      </label>
    </section>

    <section class="card grid gap-3 md:grid-cols-2">
      <h2 class="h2 md:col-span-2">{de.settings.pay}</h2>
      <label
        ><span class="label">{de.settings.defaultPay}</span><input
          class="input"
          inputmode="decimal"
          bind:value={pay}
        /></label
      >
      <label
        ><span class="label">{de.settings.taxFree}</span><input
          class="input"
          inputmode="decimal"
          bind:value={limit}
        /></label
      >
      <label class="md:col-span-2">
        <span class="label">{de.settings.autoConfirm}</span>
        <select class="input" bind:value={autoConfirm}>
          <option value="">{de.settings.autoConfirmOff}</option>
          {#each [24, 48, 72, 168] as h (h)}<option value={String(h)}
              >{de.settings.autoConfirmHours(h)}</option
            >{/each}
        </select>
        <span class="mt-1 block text-sm text-ink-muted">{de.settings.autoConfirmHint}</span>
      </label>
    </section>

    <section class="card grid gap-3 md:grid-cols-2">
      <h2 class="h2 md:col-span-2">{de.settings.alarm}</h2>
      <label
        ><span class="label">{de.settings.ringSeconds}</span><input
          class="input"
          type="number"
          min="5"
          max="600"
          bind:value={s.alarmRingSeconds}
        /></label
      >
      <label
        ><span class="label">{de.settings.snooze}</span><input
          class="input"
          type="number"
          min="1"
          max="240"
          bind:value={s.snoozeMinutes}
        /></label
      >
      <label class="flex min-h-touch items-center gap-3 md:col-span-2"
        ><input type="checkbox" class="size-5" bind:checked={s.alarmVibrate} /> {de.settings.vibrate}</label
      >
      <fieldset class="md:col-span-2">
        <legend class="label">{de.settings.quiet}</legend>
        <div class="flex items-center gap-2">
          <span>{de.settings.quietFrom}</span><input
            class="input w-36"
            type="time"
            bind:value={s.quietStart}
            aria-label="Ruhezeit von"
          />
          <span>{de.settings.quietTo}</span><input
            class="input w-36"
            type="time"
            bind:value={s.quietEnd}
            aria-label="Ruhezeit bis"
          />
        </div>
        <span class="mt-1 block text-sm text-ink-muted">{de.settings.quietHint}</span>
      </fieldset>
    </section>

    <button class="btn-primary" disabled={busy}>{de.common.save}</button>
  </form>
{/if}
