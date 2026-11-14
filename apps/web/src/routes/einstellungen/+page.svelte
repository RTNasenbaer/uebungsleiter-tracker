<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import { centsToEuroString, parseEuroToCents, type SettingsDto } from '@ult/shared';
  import { api } from '$lib/api';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import Switch from '$lib/components/ui/Switch.svelte';
  import TextArea from '$lib/components/ui/TextArea.svelte';
  import TextField from '$lib/components/ui/TextField.svelte';
  import { de } from '$lib/i18n/de';
  import { setTheme, theme, type ThemeChoice } from '$lib/theme.svelte';
  import { bumpRevision, toast } from '$lib/state.svelte';

  let s = $state<SettingsDto | null>(null);
  let pay = $state('');
  let limit = $state('');
  let deadline = $state('');
  let autoConfirm = $state('');
  let busy = $state(false);
  let deadlineError = $state<string | null>(null);
  let payError = $state<string | null>(null);
  let themeChoice = $state<ThemeChoice>(theme.choice);
  $effect(() => {
    if (themeChoice !== theme.choice) setTheme(themeChoice);
  });

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
    payError = defaultPayCents === null || taxFreeLimitCents === null ? de.form.invalidPay : null;
    deadlineError = dm ? null : de.settings.deadlineError;
    if (payError || deadlineError || !dm || defaultPayCents === null || taxFreeLimitCents === null) return;
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

<PageHeader label={de.settings.label} title={de.settings.title} />

<div class="flex max-w-form flex-col gap-8">
  <section aria-labelledby="appearance-h" class="flex flex-col gap-3">
    <SectionHeader id="appearance-h" title={de.settings.appearance} />
    <SegmentedControl
      legend={de.settings.theme}
      bind:value={themeChoice}
      options={[
        { value: 'system', label: de.settings.themeSystem },
        { value: 'light', label: de.settings.themeLight },
        { value: 'dark', label: de.settings.themeDark },
      ]}
    />
    <p class="text-sm text-muted">{de.settings.themeHint}</p>
  </section>

  {#if !s}
    <Skeleton rows={3} lines={3} />
  {:else}
    <form class="flex flex-col gap-8 pb-24 md:pb-0" onsubmit={save}>
      <section aria-labelledby="profile-h" class="flex flex-col gap-4">
        <SectionHeader id="profile-h" title={de.settings.profile} />
        <TextField
          label={de.settings.displayName}
          bind:value={s.displayName}
          maxlength={120}
          autocomplete="name"
        />
        <TextField label={de.settings.clubName} bind:value={s.clubName} maxlength={120} />
        <TextField
          label={de.settings.iban}
          bind:value={s.iban}
          maxlength={42}
          autocomplete="off"
          spellcheck={false}
          help={de.settings.ibanHint}
          inputClass="tracking-wide"
        />
      </section>

      <section aria-labelledby="report-h" class="flex flex-col gap-4">
        <SectionHeader id="report-h" title={de.settings.report} />
        <TextField
          type="email"
          label={de.settings.reportRecipient}
          bind:value={s.reportRecipient}
          maxlength={200}
        />
        <TextField
          label={de.settings.reportDeadline}
          bind:value={deadline}
          placeholder="15.12."
          inputmode="decimal"
          error={deadlineError}
        />
        <TextArea
          label={de.settings.reportIntro}
          bind:value={s.reportIntroTemplate}
          maxlength={2000}
          help={de.settings.reportIntroHint}
        />
      </section>

      <section aria-labelledby="pay-h" class="flex flex-col gap-4">
        <SectionHeader id="pay-h" title={de.settings.pay} />
        <div class="grid gap-4 sm:grid-cols-2">
          <TextField label={de.settings.defaultPay} bind:value={pay} inputmode="decimal" error={payError} />
          <TextField label={de.settings.taxFree} bind:value={limit} inputmode="decimal" />
        </div>
        <Select
          label={de.settings.autoConfirm}
          bind:value={autoConfirm}
          help={de.settings.autoConfirmHint}
          options={[
            { value: '', label: de.settings.autoConfirmOff },
            ...[24, 48, 72, 168].map((h) => ({ value: String(h), label: de.settings.autoConfirmHours(h) })),
          ]}
        />
      </section>

      <section aria-labelledby="alarm-h" class="flex flex-col gap-4">
        <SectionHeader id="alarm-h" title={de.settings.alarm} />
        <div class="grid grid-cols-2 gap-4">
          <TextField
            type="number"
            label={de.settings.ringSeconds}
            bind:value={s.alarmRingSeconds}
            min={5}
            max={600}
            inputmode="numeric"
          />
          <TextField
            type="number"
            label={de.settings.snooze}
            bind:value={s.snoozeMinutes}
            min={1}
            max={240}
            inputmode="numeric"
          />
        </div>
        <Card class="py-2 md:py-2"><Switch label={de.settings.vibrate} bind:checked={s.alarmVibrate} /></Card>
        <fieldset class="flex flex-col gap-2">
          <legend class="mb-1.5 text-sm font-semibold">{de.settings.quiet}</legend>
          <div class="grid grid-cols-2 gap-4">
            <TextField type="time" label={de.settings.quietFrom} bind:value={s.quietStart} />
            <TextField type="time" label={de.settings.quietTo} bind:value={s.quietEnd} />
          </div>
          <p class="text-sm text-muted">{de.settings.quietHint}</p>
        </fieldset>
      </section>

      <div
        class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t-hl border-line bg-surface px-4 py-3 md:static md:border-0 md:bg-transparent md:p-0"
      >
        <Button type="submit" size="lg" full class="md:w-auto md:px-10" loading={busy}
          >{de.common.save}</Button
        >
      </div>
    </form>
  {/if}
</div>
