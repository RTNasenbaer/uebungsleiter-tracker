<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import Field from './Field.svelte';
  import { controlClass, describedBy } from './fieldStyles';

  let {
    label,
    value = $bindable(),
    help,
    error,
    class: klass = '',
    ...rest
  }: {
    label: string;
    value?: string;
    help?: string;
    error?: string | null;
    class?: string;
  } & Omit<HTMLTextareaAttributes, 'value' | 'class'> = $props();

  const id = $props.id();
</script>

<Field {id} {label} {help} {error} class={klass}>
  <textarea
    {id}
    bind:value
    class="{controlClass} min-h-32 py-2.5 leading-normal"
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={describedBy(id, help, error)}
    {...rest}
  ></textarea>
</Field>
