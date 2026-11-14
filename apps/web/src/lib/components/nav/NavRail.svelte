<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Tablets (768–1023 px): 72-px rail with icons + short labels, FAB on top. -->
<script lang="ts">
  import Ellipsis from 'lucide-svelte/icons/ellipsis';
  import { page } from '$app/state';
  import { de } from '$lib/i18n/de';
  import { app } from '$lib/state.svelte';
  import Logo from '../brand/Logo.svelte';
  import Fab from './Fab.svelte';
  import OpenBadge from './OpenBadge.svelte';
  import { calendar, home, isActive, open, series, sessions } from './items';

  let { onmore, moreOpen, moreActive }: { onmore: () => void; moreOpen: boolean; moreActive: boolean } =
    $props();
  const items = [home, open, calendar, sessions, series];
</script>

<nav
  class="sticky top-0 hidden h-dvh w-rail shrink-0 flex-col items-center gap-1 border-r-hl border-line bg-surface py-4 md:flex lg:hidden"
  aria-label={de.nav.mainNav}
>
  <a
    href="/"
    class="mb-2 inline-flex size-12 items-center justify-center rounded-full"
    aria-label={de.appName}
  >
    <Logo size={32} mono />
  </a>
  <Fab class="mb-4" />
  {#each items as item (item.href)}
    {@const active = isActive(page.url.pathname, item.href)}
    <a
      href={item.href}
      class="flex w-16 flex-col items-center gap-1 py-1.5 text-[0.75rem] font-semibold {active
        ? 'text-fg'
        : 'text-muted hover:text-fg'}"
      aria-current={active ? 'page' : undefined}
    >
      <span
        class="relative inline-flex h-8 w-14 items-center justify-center rounded-full {active
          ? 'bg-surface-sunken'
          : ''}"
      >
        <item.icon size={24} strokeWidth={active ? 2.25 : 1.75} />
        {#if item.badge}
          <OpenBadge count={app.me?.openCount ?? 0} class="absolute -top-1 right-1" />
        {/if}
      </span>
      {item.label}
    </a>
  {/each}
  <button
    type="button"
    class="flex w-16 cursor-pointer flex-col items-center gap-1 py-1.5 text-[0.75rem] font-semibold {moreActive
      ? 'text-fg'
      : 'text-muted hover:text-fg'}"
    aria-expanded={moreOpen}
    aria-haspopup="dialog"
    onclick={onmore}
  >
    <span
      class="inline-flex h-8 w-14 items-center justify-center rounded-full {moreActive
        ? 'bg-surface-sunken'
        : ''}"
    >
      <Ellipsis size={24} strokeWidth={1.75} aria-hidden="true" />
    </span>
    {de.nav.more}
  </button>
</nav>
