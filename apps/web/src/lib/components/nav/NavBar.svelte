<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Phones (< 768 px): Start · Kalender · ( + ) · Termine · Mehr -->
<script lang="ts">
  import Ellipsis from 'lucide-svelte/icons/ellipsis';
  import { page } from '$app/state';
  import { de } from '$lib/i18n/de';
  import { app } from '$lib/state.svelte';
  import Fab from './Fab.svelte';
  import OpenBadge from './OpenBadge.svelte';
  import { calendar, home, isActive, sessions, type NavItem } from './items';

  let { onmore, moreOpen, moreActive }: { onmore: () => void; moreOpen: boolean; moreActive: boolean } =
    $props();
</script>

{#snippet tab(item: NavItem)}
  {@const active = isActive(page.url.pathname, item.href)}
  <a
    href={item.href}
    class="relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold {active
      ? 'text-fg'
      : 'text-muted'}"
    aria-current={active ? 'page' : undefined}
  >
    <span class="relative">
      <item.icon size={24} strokeWidth={active ? 2.25 : 1.75} />
      {#if item.badge}
        <OpenBadge
          count={app.me?.openCount ?? 0}
          testid="open-badge-mobile"
          class="absolute -top-1.5 left-4"
        />
      {/if}
    </span>
    {item.label}
    {#if active}<span class="absolute top-0 h-[3px] w-8 rounded-b-full bg-fg" aria-hidden="true"></span>{/if}
  </a>
{/snippet}

<nav
  class="fixed inset-x-0 bottom-0 z-30 border-t-hl border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
  aria-label={de.nav.mainNav}
>
  <div class="grid grid-cols-5 items-stretch">
    {@render tab(home)}
    {@render tab(calendar)}
    <div class="flex items-start justify-center">
      {#if !page.url.pathname.startsWith('/neu')}<Fab class="-mt-5" />{/if}
    </div>
    {@render tab(sessions)}
    <button
      type="button"
      class="relative flex min-h-16 cursor-pointer flex-col items-center justify-center gap-0.5 text-xs font-semibold {moreActive
        ? 'text-fg'
        : 'text-muted'}"
      aria-expanded={moreOpen}
      aria-haspopup="dialog"
      onclick={onmore}
    >
      <Ellipsis size={24} strokeWidth={moreActive ? 2.25 : 1.75} aria-hidden="true" />
      {de.nav.more}
      {#if moreActive}<span class="absolute top-0 h-[3px] w-8 rounded-b-full bg-fg" aria-hidden="true"
        ></span>{/if}
    </button>
  </div>
</nav>
