<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Yellow dot with the number of open appointments. -->
<script lang="ts">
  import { de } from '$lib/i18n/de';
  let { count, testid, class: klass = '' }: { count: number; testid?: string; class?: string } = $props();
</script>

{#if count > 0}
  <span
    class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-pending px-1.5 text-xs leading-none font-bold text-on-pending tabular-nums {klass}"
    data-testid={testid}
    ><span aria-hidden="true">{count}</span><span class="sr-only">{de.nav.openBadge(count)}</span></span
  >
{/if}
