<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- One appointment: status stripe left, date/time big, team · training · place, units/pay, status, actions. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { formatCents, formatDateDe, formatDayMonthDe, type SessionDto } from '@ult/shared';
  import { de } from '$lib/i18n/de';
  import Checkbox from './Checkbox.svelte';
  import StatusBadge from './StatusBadge.svelte';

  let {
    session: s,
    onopen,
    actions,
    selectable = false,
    selected = false,
    onselect,
    showStatus = true,
    showMoney = false,
    highlight = false,
    testid,
  }: {
    session: SessionDto;
    onopen?: () => void;
    actions?: Snippet;
    selectable?: boolean;
    selected?: boolean;
    onselect?: () => void;
    showStatus?: boolean;
    showMoney?: boolean;
    /** the one open question on screen: soft yellow background */
    highlight?: boolean;
    testid?: string;
  } = $props();

  const stripe: Record<string, string> = {
    held: 'bg-held',
    not_held: 'bg-not-held',
    pending: 'bg-pending',
    planned: 'bg-planned',
    cancelled: 'bg-cancelled',
  };
  const meta = $derived([s.team, s.title, s.location].filter(Boolean).join(' · '));
  const label = $derived(`${formatDateDe(s.date)}, ${s.startTime}–${s.endTime}`);
</script>

<div
  class="relative flex min-w-0 items-stretch overflow-hidden rounded-md border-hl {highlight
    ? 'border-transparent bg-accent-soft'
    : 'border-line bg-surface'}"
  data-testid={testid}
  data-status={s.status}
>
  <span class="w-[var(--hl-size-stripe)] shrink-0 {stripe[s.status]}" aria-hidden="true"></span>
  {#if selectable}
    <div class="flex items-center pl-2">
      <Checkbox
        checked={selected}
        onchange={onselect}
        hideLabel
        label={de.sessions.selectRow(`${label} ${s.team}`)}
      />
    </div>
  {/if}
  <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
    {#snippet body()}
      <span class="flex flex-wrap items-baseline gap-x-2">
        <span class="font-score text-xl font-semibold">{formatDayMonthDe(s.date)}</span>
        <span class="font-score text-xl font-semibold text-muted">{s.startTime}–{s.endTime}</span>
      </span>
      {#if meta}<span class="max-w-full truncate text-sm text-muted">{meta}</span>{/if}
      {#if showMoney || s.note}
        <span class="text-sm text-muted">
          {[showMoney ? `${s.units} × ${formatCents(s.payCents)}` : '', s.note ?? '']
            .filter(Boolean)
            .join(' · ')}
        </span>
      {/if}
    {/snippet}
    {#if onopen}
      <button
        type="button"
        class="flex min-h-12 min-w-0 flex-1 basis-48 cursor-pointer flex-col items-start rounded-sm text-left"
        onclick={onopen}
        aria-label="{label}: {de.common.edit}"
      >
        {@render body()}
      </button>
    {:else}
      <div class="flex min-h-12 min-w-0 flex-1 basis-48 flex-col items-start">{@render body()}</div>
    {/if}
    {#if showStatus && !actions}<StatusBadge status={s.status} size="sm" />{/if}
    {#if actions}<div class="flex shrink-0 gap-2">{@render actions()}</div>{/if}
  </div>
</div>
