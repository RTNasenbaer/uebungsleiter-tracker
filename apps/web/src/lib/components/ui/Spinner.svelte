<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Loader: the ball seam turns slowly; static with prefers-reduced-motion. -->
<script lang="ts">
  import BallSeam from '../brand/BallSeam.svelte';
  import { de } from '$lib/i18n/de';

  let { size = 20, label = de.common.loading }: { size?: number; label?: string | null } = $props();
</script>

<span class="inline-flex items-center" role={label ? 'status' : undefined}>
  <BallSeam {size} class="animate-seam" />
  {#if label}<span class="sr-only">{label}</span>{/if}
</span>
