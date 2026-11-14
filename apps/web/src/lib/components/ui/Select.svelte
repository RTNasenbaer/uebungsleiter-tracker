<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import type { HTMLSelectAttributes } from 'svelte/elements';
  import ChevronDown from 'lucide-svelte/icons/chevron-down';
  import Field from './Field.svelte';
  import { controlClass, describedBy } from './fieldStyles';

  let {
    label,
    value = $bindable(),
    options,
    help,
    error,
    hideLabel = false,
    class: klass = '',
    ...rest
  }: {
    label: string;
    value?: string | number;
    options: readonly { value: string | number; label: string }[];
    help?: string;
    error?: string | null;
    hideLabel?: boolean;
    class?: string;
  } & Omit<HTMLSelectAttributes, 'value' | 'class'> = $props();

  const id = $props.id();
</script>

<Field {id} {label} {help} {error} {hideLabel} class={klass}>
  <div class="relative">
    <select
      {id}
      bind:value
      class="{controlClass} cursor-pointer appearance-none pr-10"
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={describedBy(id, help, error)}
      {...rest}
    >
      {#each options as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
    </select>
    <ChevronDown
      size={20}
      strokeWidth={1.75}
      aria-hidden="true"
      class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
    />
  </div>
</Field>
