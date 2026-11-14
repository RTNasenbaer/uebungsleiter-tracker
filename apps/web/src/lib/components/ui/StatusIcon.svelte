<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import type { SessionStatus } from '@ult/shared';
  import Ban from 'lucide-svelte/icons/ban';
  import CalendarClock from 'lucide-svelte/icons/calendar-clock';
  import CircleCheck from 'lucide-svelte/icons/circle-check';
  import CircleQuestionMark from 'lucide-svelte/icons/circle-question-mark';
  import CircleX from 'lucide-svelte/icons/circle-x';

  let { status, size = 18 }: { status: SessionStatus; size?: number } = $props();
  const icons = {
    held: CircleCheck,
    not_held: CircleX,
    pending: CircleQuestionMark,
    planned: CalendarClock,
    cancelled: Ban,
  };
  const Icon = $derived(icons[status]);
</script>

<Icon {size} strokeWidth={1.75} aria-hidden="true" class="shrink-0" />
