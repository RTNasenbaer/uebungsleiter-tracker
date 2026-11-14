<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Radio card: title + one line of explanation; selected = primary border. -->
<script lang="ts">
  let {
    name,
    value,
    group = $bindable(),
    title,
    description,
    disabled = false,
  }: {
    name: string;
    value: string;
    group: string;
    title: string;
    description: string;
    disabled?: boolean;
  } = $props();
</script>

<label
  class="flex cursor-pointer items-start gap-3 rounded-md border-hl border-line bg-surface p-4 transition-press hover:border-line-strong has-checked:border-primary has-checked:bg-surface-sunken has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-outer has-disabled:opacity-50"
>
  <input
    type="radio"
    {name}
    {value}
    bind:group
    {disabled}
    class="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--hl-primary)] focus-visible:outline-none focus-visible:shadow-none"
  />
  <span class="flex flex-col gap-0.5">
    <span class="font-semibold">{title}</span>
    <span class="text-sm text-muted">{description}</span>
  </span>
</label>
