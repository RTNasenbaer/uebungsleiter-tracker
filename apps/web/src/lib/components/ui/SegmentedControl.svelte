<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Segmented control: a native radio group (arrow keys work out of the box). -->
<script lang="ts" generics="T extends string | number">
  let {
    legend,
    value = $bindable(),
    options,
    hideLegend = false,
    class: klass = '',
  }: {
    legend: string;
    value: T;
    options: readonly { value: T; label: string }[];
    hideLegend?: boolean;
    class?: string;
  } = $props();
  const name = $props.id();
</script>

<fieldset class="min-w-0 {klass}">
  <legend class={hideLegend ? 'sr-only' : 'mb-1.5 text-sm font-semibold'}>{legend}</legend>
  <div class="flex rounded-sm border-hl border-line-strong bg-surface-sunken p-1">
    {#each options as o (o.value)}
      <label
        class="relative flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-[calc(var(--hl-radius-sm)-2px)] px-3 text-center text-sm font-semibold text-muted transition-press has-checked:bg-primary has-checked:text-on-primary has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-outer"
      >
        <input type="radio" class="sr-only" {name} value={o.value} bind:group={value} />
        {o.label}
      </label>
    {/each}
  </div>
</fieldset>
