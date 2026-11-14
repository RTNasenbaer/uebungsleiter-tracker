<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- TextField / DateField / TimeField: native inputs (native pickers on phones), label always visible. -->
<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import Field from './Field.svelte';
  import { controlClass, describedBy } from './fieldStyles';

  let {
    label,
    value = $bindable(),
    help,
    error,
    hideLabel = false,
    type = 'text',
    class: klass = '',
    inputClass = '',
    id: idProp,
    autocomplete = 'off',
    ...rest
  }: {
    label: string;
    value?: string | number | null;
    help?: string;
    error?: string | null;
    hideLabel?: boolean;
    type?: 'text' | 'date' | 'time' | 'number' | 'email' | 'url' | 'search';
    class?: string;
    inputClass?: string;
    id?: string;
  } & Omit<HTMLInputAttributes, 'value' | 'type' | 'class'> = $props();

  const uid = $props.id();
  const id = $derived(idProp ?? uid);
</script>

<Field {id} {label} {help} {error} {hideLabel} class={klass}>
  <input
    {id}
    {type}
    bind:value
    class="{controlClass} {type === 'date' || type === 'time' ? 'appearance-none' : ''} {inputClass}"
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={describedBy(id, help, error)}
    {autocomplete}
    {...rest}
  />
</Field>
