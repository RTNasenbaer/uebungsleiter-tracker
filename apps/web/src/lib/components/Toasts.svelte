<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import { toasts } from '$lib/state.svelte';
</script>

<div
  class="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
  aria-live="polite"
  role="status"
>
  {#each toasts as t (t.id)}
    <div
      class="pointer-events-auto max-w-md rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg {t.kind ===
      'error'
        ? 'bg-red-700'
        : 'bg-slate-800'}"
    >
      {t.text}
    </div>
  {/each}
</div>
