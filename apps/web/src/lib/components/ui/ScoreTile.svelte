<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Scoreboard value: caps label, big condensed number, optional subtitle. Lives on the scoreboard surface. -->
<script lang="ts">
  let {
    label,
    value,
    sub,
    testid,
    class: klass = '',
  }: {
    label: string;
    value: string | number;
    sub?: string | undefined;
    testid?: string;
    class?: string;
  } = $props();
</script>

<div class="flex min-w-0 flex-col gap-1 {klass}">
  <dt class="label-caps text-scoreboard-muted">{label}</dt>
  <dd
    class="font-score text-[clamp(2.25rem,1.6rem+3vw,4.5rem)] font-semibold whitespace-nowrap"
    data-testid={testid}
  >
    {value}
  </dd>
  {#if sub}<dd class="text-sm text-scoreboard-muted">{sub}</dd>{/if}
</div>
