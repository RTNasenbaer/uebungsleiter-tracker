<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Checkbox with a 48-px hit area; visual box 24 px. -->
<script lang="ts">
  import Check from 'lucide-svelte/icons/check';
  let {
    checked = $bindable(false),
    label,
    hideLabel = false,
    onchange,
    class: klass = '',
  }: {
    checked?: boolean;
    label: string;
    hideLabel?: boolean;
    onchange?: (e: Event) => void;
    class?: string;
  } = $props();
</script>

<label
  class="flex min-h-12 min-w-12 cursor-pointer items-center {hideLabel ? 'justify-center' : 'gap-3'} {klass}"
>
  <span class="relative inline-flex size-6 shrink-0 items-center justify-center">
    <input
      type="checkbox"
      class="peer absolute inset-0 m-0 size-full cursor-pointer appearance-none rounded-[5px] border-2 border-line-strong bg-surface transition-press checked:border-primary checked:bg-primary"
      bind:checked
      {onchange}
      aria-label={hideLabel ? label : undefined}
    />
    <Check
      size={18}
      strokeWidth={2.5}
      aria-hidden="true"
      class="pointer-events-none relative text-on-primary opacity-0 peer-checked:opacity-100"
    />
  </span>
  {#if !hideLabel}<span class="font-medium">{label}</span>{/if}
</label>
