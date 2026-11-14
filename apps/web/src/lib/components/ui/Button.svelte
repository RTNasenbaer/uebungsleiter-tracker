<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!--
  Button (DESIGN.md §8). Variants: primary · accent (only the main "Ja" answer) · secondary (outline) · ghost · danger.
  Sizes: sm 40 · md 48 · lg 56 · xl 72 px. Renders <a> when `href` is set. `loading` shows the ball spinner.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
  import Spinner from './Spinner.svelte';

  type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
  type Size = 'sm' | 'md' | 'lg' | 'xl';

  let {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    full = false,
    href,
    type = 'button',
    class: klass = '',
    children,
    ...rest
  }: {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    disabled?: boolean;
    full?: boolean;
    href?: string;
    type?: 'button' | 'submit' | 'reset';
    class?: string;
    children: Snippet;
  } & Omit<HTMLButtonAttributes & HTMLAnchorAttributes, 'type' | 'class' | 'children'> = $props();

  const variants: Record<Variant, string> = {
    primary: 'bg-primary text-on-primary hover:bg-primary-hover',
    accent: 'bg-accent text-on-accent hover:bg-accent-hover',
    secondary: 'border-hl border-line-strong bg-surface text-fg hover:bg-surface-sunken',
    ghost: 'text-fg hover:bg-surface-sunken',
    danger: 'bg-danger text-on-danger hover:opacity-90',
  };
  const sizes: Record<Size, string> = {
    sm: 'min-h-10 px-3 text-sm',
    md: 'min-h-12 px-4 text-base',
    lg: 'min-h-14 px-5 text-lg',
    xl: 'min-h-18 px-6 text-xl',
  };
  const cls = $derived(
    [
      'transition-press inline-flex cursor-pointer select-none items-center justify-center gap-2 rounded-sm font-semibold',
      'active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40',
      variants[variant],
      sizes[size],
      full ? 'w-full' : '',
      klass,
    ].join(' '),
  );
</script>

{#if href && !disabled}
  <a {href} class={cls} {...rest}>{@render children()}</a>
{:else}
  <button
    {type}
    class={cls}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...rest as HTMLButtonAttributes}
  >
    {#if loading}<Spinner size={size === 'sm' ? 16 : 20} label={null} />{/if}
    {@render children()}
  </button>
{/if}
