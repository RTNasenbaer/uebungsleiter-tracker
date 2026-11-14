<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import type { SessionStatus } from '@ult/shared';
  import { de } from '$lib/i18n/de';

  let { status }: { status: SessionStatus } = $props();

  const styles: Record<SessionStatus, string> = {
    planned: 'border-status-planned text-status-planned',
    pending: 'border-status-pending text-status-pending',
    held: 'border-status-held text-status-held',
    not_held: 'border-status-not-held text-status-not-held',
    cancelled: 'border-status-cancelled text-status-cancelled line-through',
  };
</script>

<span
  class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap {styles[
    status
  ]}"
  data-status={status}>{de.status[status]}</span
>
