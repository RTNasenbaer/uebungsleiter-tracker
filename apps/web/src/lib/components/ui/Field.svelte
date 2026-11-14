<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Shared frame for form fields: visible label, optional help text, error below the field. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import CircleAlert from 'lucide-svelte/icons/circle-alert';

  let {
    id,
    label,
    help,
    error,
    hideLabel = false,
    class: klass = '',
    children,
  }: {
    id: string;
    label: string;
    help?: string | undefined;
    error?: string | null | undefined;
    hideLabel?: boolean;
    class?: string;
    children: Snippet;
  } = $props();
</script>

<div class="flex min-w-0 flex-col gap-1.5 {klass}">
  <label for={id} class={hideLabel ? 'sr-only' : 'text-sm font-semibold text-fg'}>{label}</label>
  {@render children()}
  {#if error}
    <p id="{id}-error" class="flex items-start gap-1.5 text-sm font-medium text-danger">
      <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" class="mt-0.5 shrink-0" />
      {error}
    </p>
  {:else if help}
    <p id="{id}-help" class="text-sm text-muted">{help}</p>
  {/if}
</div>
