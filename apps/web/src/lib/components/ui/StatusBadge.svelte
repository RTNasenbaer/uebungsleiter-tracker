<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Status (DESIGN.md §2): always color + icon + text, never color alone. -->
<script lang="ts">
  import type { SessionStatus } from '@ult/shared';
  import { de } from '$lib/i18n/de';
  import StatusIcon from './StatusIcon.svelte';

  let { status, size = 'md' }: { status: SessionStatus; size?: 'sm' | 'md' } = $props();

  const styles: Record<SessionStatus, string> = {
    held: 'text-held',
    not_held: 'text-not-held',
    pending: 'bg-pending text-on-pending',
    planned: 'text-planned',
    cancelled: 'text-cancelled line-through',
  };
</script>

<span
  class="inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap {size === 'sm'
    ? 'text-xs'
    : 'text-sm'} {status === 'pending' ? 'px-2.5 py-0.5' : ''} {styles[status]}"
  data-status={status}
>
  <StatusIcon {status} size={size === 'sm' ? 16 : 18} />
  {de.status[status]}
</span>
