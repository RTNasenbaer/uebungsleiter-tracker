<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Desktop (≥ 1024 px): 240-px sidebar – logo, navigation, "+ Neues Training", device status and "Über" at the bottom. -->
<script lang="ts">
  import Bell from 'lucide-svelte/icons/bell';
  import Plus from 'lucide-svelte/icons/plus';
  import Smartphone from 'lucide-svelte/icons/smartphone';
  import Monitor from 'lucide-svelte/icons/monitor';
  import { page } from '$app/state';
  import { de } from '$lib/i18n/de';
  import { app } from '$lib/state.svelte';
  import Logo from '../brand/Logo.svelte';
  import Button from '../ui/Button.svelte';
  import OpenBadge from './OpenBadge.svelte';
  import * as nav from './items';

  const items = $derived([
    nav.home,
    nav.open,
    nav.calendar,
    nav.sessions,
    nav.series,
    nav.exceptions,
    nav.exportItem,
    nav.devices,
    nav.settings,
    ...(app.native ? [nav.alarmSetup] : []),
  ]);
  const device = $derived(app.me?.device ?? null);
</script>

<nav
  class="sticky top-0 hidden h-dvh w-sidebar shrink-0 flex-col border-r-hl border-line bg-surface lg:flex"
  aria-label={de.nav.mainNav}
>
  <a href="/" class="flex items-center gap-3 px-5 pt-5 pb-4">
    <Logo size={36} mono class="text-fg" />
    <span class="font-score text-xl leading-tight font-bold">{de.appName}</span>
  </a>
  <div class="px-4 pb-4">
    <Button href="/neu" full>
      <Plus size={20} strokeWidth={2} aria-hidden="true" />
      {de.nav.newTraining}
    </Button>
  </div>
  <div class="mx-5 mb-2 h-[var(--hl-size-line)] bg-line" aria-hidden="true"></div>
  <ul class="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
    {#each items as item (item.href)}
      {@const active = nav.isActive(page.url.pathname, item.href)}
      <li>
        <a
          href={item.href}
          class="relative flex min-h-11 items-center gap-3 rounded-sm px-3 font-medium {active
            ? 'bg-surface-sunken text-fg'
            : 'text-muted hover:bg-surface-sunken hover:text-fg'}"
          aria-current={active ? 'page' : undefined}
        >
          {#if active}<span class="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-fg" aria-hidden="true"
            ></span>{/if}
          <item.icon size={20} strokeWidth={active ? 2.25 : 1.75} />
          <span class="flex-1">{item.label}</span>
          {#if item.badge}<OpenBadge count={app.me?.openCount ?? 0} testid="open-badge" />{/if}
        </a>
      </li>
    {/each}
  </ul>
  <div class="flex flex-col gap-1 border-t-hl border-line px-3 py-3">
    <a
      href="/geraete"
      class="flex min-h-11 items-center gap-3 rounded-sm px-3 text-sm text-muted hover:bg-surface-sunken hover:text-fg"
    >
      {#if device?.isAlarmDevice}
        <Bell size={18} strokeWidth={1.75} aria-hidden="true" />
      {:else if device?.platform === 'android'}
        <Smartphone size={18} strokeWidth={1.75} aria-hidden="true" />
      {:else}
        <Monitor size={18} strokeWidth={1.75} aria-hidden="true" />
      {/if}
      <span class="min-w-0 truncate">
        {device ? de.nav.thisDevice(device.name) : de.nav.devices}{device?.isAlarmDevice
          ? ` · ${de.devices.alarmDevice}`
          : ''}
      </span>
    </a>
    <a
      href="/ueber"
      class="flex min-h-11 items-center gap-3 rounded-sm px-3 text-sm text-muted hover:bg-surface-sunken hover:text-fg"
      aria-current={nav.isActive(page.url.pathname, '/ueber') ? 'page' : undefined}
    >
      <nav.about.icon size={18} strokeWidth={1.75} />
      {de.nav.about}
    </a>
  </div>
</nav>
