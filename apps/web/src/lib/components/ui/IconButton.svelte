<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Icon-only button: always an aria-label and a tooltip (title) for desktop (DESIGN.md §10). 48 × 48 hit area. -->
<script lang="ts">
  import type { IconComponent } from '../nav/items';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  let {
    icon: Icon,
    label,
    variant = 'ghost',
    class: klass = '',
    ...rest
  }: {
    icon: IconComponent;
    label: string;
    variant?: 'ghost' | 'secondary';
    class?: string;
  } & Omit<HTMLButtonAttributes, 'class'> = $props();
</script>

<button
  type="button"
  aria-label={label}
  title={label}
  class="transition-press inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg hover:bg-surface-sunken active:scale-[.96] disabled:cursor-not-allowed disabled:opacity-40 {variant ===
  'secondary'
    ? 'border-hl border-line-strong bg-surface'
    : ''} {klass}"
  {...rest}
>
  <Icon size={24} strokeWidth={1.75} />
</button>
