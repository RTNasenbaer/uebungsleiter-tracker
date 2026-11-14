<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import { WEEKDAY_LABELS, hasWeekday, toggleWeekday } from '@ult/shared';
  import { de } from '$lib/i18n/de';

  let { value = $bindable(0) }: { value: number } = $props();
</script>

<fieldset>
  <legend class="label">{de.form.weekdays}</legend>
  <div class="grid grid-cols-7 gap-1 sm:flex sm:gap-2">
    {#each WEEKDAY_LABELS as label, i (label)}
      {@const on = hasWeekday(value, i + 1)}
      <button
        type="button"
        class="min-h-touch rounded-full border-2 px-0 font-semibold sm:min-w-touch sm:px-3 transition-colors {on
          ? 'border-brand-700 bg-brand-700 text-white'
          : 'border-line bg-surface text-ink'}"
        aria-pressed={on}
        onclick={() => (value = toggleWeekday(value, i + 1))}>{label}</button
      >
    {/each}
  </div>
</fieldset>
