<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Single-choice filter as chips (native radio group: arrow keys, one tab stop). -->
<script lang="ts" generics="T extends string">
  let {
    legend,
    value = $bindable(),
    options,
  }: { legend: string; value: T; options: readonly { value: T; label: string }[] } = $props();
  const name = $props.id();
</script>

<fieldset class="min-w-0">
  <legend class="sr-only">{legend}</legend>
  <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
    {#each options as o (o.value)}
      <label
        class="relative inline-flex min-h-12 shrink-0 cursor-pointer items-center rounded-full border-hl border-line-strong bg-surface px-4 text-sm font-semibold transition-press hover:bg-surface-sunken has-checked:border-primary has-checked:bg-primary has-checked:text-on-primary has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-outer"
      >
        <input type="radio" class="sr-only" {name} value={o.value} bind:group={value} />
        {o.label}
      </label>
    {/each}
  </div>
</fieldset>
