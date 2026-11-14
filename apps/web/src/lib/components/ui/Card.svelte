<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Surface with a field line instead of a shadow. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  let {
    children,
    padded = true,
    class: klass = '',
    ...rest
  }: { children: Snippet; padded?: boolean; class?: string } & Omit<
    HTMLAttributes<HTMLDivElement>,
    'class'
  > = $props();
</script>

<div class="rounded-md border-hl border-line bg-surface {padded ? 'p-4 md:p-5' : ''} {klass}" {...rest}>
  {@render children()}
</div>
