<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Switch: native checkbox with role="switch"; whole row is the touch target, switch on the right. -->
<script lang="ts">
  let {
    label,
    checked = $bindable(false),
    description,
    disabled = false,
    class: klass = '',
  }: {
    label: string;
    checked?: boolean;
    description?: string;
    disabled?: boolean;
    class?: string;
  } = $props();
  const id = $props.id();
</script>

<label for={id} class="flex min-h-12 cursor-pointer items-center justify-between gap-4 {klass}">
  <span class="flex min-w-0 flex-col">
    <span class="font-semibold">{label}</span>
    {#if description}<span id="{id}-desc" class="text-sm text-muted">{description}</span>{/if}
  </span>
  <span class="relative inline-flex shrink-0">
    <input
      {id}
      type="checkbox"
      role="switch"
      class="peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0"
      bind:checked
      {disabled}
      aria-describedby={description ? `${id}-desc` : undefined}
    />
    <span
      class="h-8 w-13 rounded-full border-hl border-line-strong bg-surface-sunken transition-press peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus-outer peer-disabled:opacity-40"
      aria-hidden="true"
    ></span>
    <span
      class="pointer-events-none absolute top-1 left-1 size-6 rounded-full bg-line-strong transition-transform duration-[var(--hl-duration-fast)] peer-checked:translate-x-5 peer-checked:bg-on-primary"
      aria-hidden="true"
    ></span>
  </span>
</label>
