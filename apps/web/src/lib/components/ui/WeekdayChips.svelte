<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!--
  Weekday chips as round "jersey numbers" (DESIGN.md §7). Toggle buttons with aria-pressed;
  arrow keys move between days (roving tabindex), Space/Enter toggles.
-->
<script lang="ts">
  import { WEEKDAY_LABELS, hasWeekday, toggleWeekday } from '@ult/shared';
  import { de } from '$lib/i18n/de';

  let { value = $bindable(0), error }: { value: number; error?: string | null } = $props();
  let focusIndex = $state(0);
  const buttons: HTMLButtonElement[] = [];
  const legendId = $props.id();

  function onkeydown(e: KeyboardEvent, i: number) {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    let next: number | null = null;
    if (delta) next = (i + delta + 7) % 7;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 6;
    if (next === null) return;
    e.preventDefault();
    focusIndex = next;
    buttons[next]?.focus();
  }
</script>

<fieldset aria-describedby={error ? `${legendId}-err` : undefined}>
  <legend class="mb-2 text-sm font-semibold">{de.form.weekdays}</legend>
  <div class="flex flex-wrap gap-2" role="group" aria-label={de.form.weekdays}>
    {#each WEEKDAY_LABELS as label, i (label)}
      {@const on = hasWeekday(value, i + 1)}
      <button
        bind:this={buttons[i]}
        type="button"
        tabindex={i === focusIndex ? 0 : -1}
        class="flex size-12 cursor-pointer items-center justify-center rounded-full font-score text-xl font-semibold transition-press active:scale-[.96] {on
          ? 'bg-primary text-on-primary'
          : 'border-2 border-line-strong bg-surface text-fg hover:bg-surface-sunken'}"
        aria-pressed={on}
        onfocus={() => (focusIndex = i)}
        onkeydown={(e) => onkeydown(e, i)}
        onclick={() => (value = toggleWeekday(value, i + 1))}>{label}</button
      >
    {/each}
  </div>
  {#if error}<p id="{legendId}-err" class="mt-2 text-sm font-medium text-danger">{error}</p>{/if}
</fieldset>
