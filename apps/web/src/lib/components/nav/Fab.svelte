<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Round "ball" FAB (56 px, primary) with a faint ball seam behind the plus. -->
<script lang="ts">
  import Plus from 'lucide-svelte/icons/plus';
  import BallSeam from '../brand/BallSeam.svelte';
  import { de } from '$lib/i18n/de';

  let { class: klass = '' }: { class?: string } = $props();
</script>

<a
  href="/neu"
  class="transition-press relative inline-flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-float hover:bg-primary-hover active:scale-[.96] {klass}"
  aria-label={de.nav.newTraining}
  title={de.nav.newTraining}
>
  <BallSeam size={46} strokeWidth={1.25} class="absolute opacity-20" />
  <Plus size={28} strokeWidth={2.25} aria-hidden="true" class="relative" />
</a>
