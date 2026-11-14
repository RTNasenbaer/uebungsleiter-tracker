<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import '../app.css';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { ApiError, initApi, isPaired, onMutation } from '$lib/api';
  import AnswerDialog from '$lib/components/AnswerDialog.svelte';
  import Toasts from '$lib/components/Toasts.svelte';
  import { de } from '$lib/i18n/de';
  import { isNative } from '$lib/native/platform';
  import { scheduleAlarmSync, syncAlarms } from '$lib/native/sync';
  import { app, refreshMe } from '$lib/state.svelte';

  let { children } = $props();

  const PUBLIC = ['/login', '/koppeln', '/ueber'];
  const isPublic = $derived(PUBLIC.some((p) => page.url.pathname.startsWith(p)));
  let moreOpen = $state(false);

  const primary = [
    { href: '/', label: de.nav.home, icon: '⌂' },
    { href: '/offen', label: de.nav.open, icon: '✓', badge: true },
    { href: '/kalender', label: de.nav.calendar, icon: '▦' },
    { href: '/trainings', label: de.nav.series, icon: '↻' },
  ];
  const secondary = $derived([
    { href: '/termine', label: de.nav.sessions },
    { href: '/ausfaelle', label: de.nav.exceptions },
    { href: '/export', label: de.nav.export },
    { href: '/geraete', label: de.nav.devices },
    { href: '/einstellungen', label: de.nav.settings },
    ...(app.native ? [{ href: '/alarm', label: de.nav.alarmSetup }] : []),
    { href: '/ueber', label: de.nav.about },
  ]);

  function active(href: string) {
    return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
  }

  $effect(() => {
    app.native = isNative();
    (async () => {
      await initApi();
      if (app.native && !isPaired()) {
        app.ready = true;
        if (!isPublic) goto('/koppeln');
        return;
      }
      try {
        await refreshMe();
        if (app.native) syncAlarms().catch(() => {});
      } catch (e) {
        if (e instanceof ApiError && e.status === 401 && !isPublic) goto(app.native ? '/koppeln' : '/login');
      } finally {
        app.ready = true;
      }
    })();
    return onMutation(() => scheduleAlarmSync());
  });

  $effect(() => {
    // close the "more" menu after navigation
    void page.url.pathname;
    moreOpen = false;
  });
</script>

<a
  href="#main"
  class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-surface focus:p-2"
  >Zum Inhalt springen</a
>

{#if isPublic || !app.me}
  <main id="main" class="mx-auto min-h-dvh max-w-3xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-8">
    {#if app.ready || isPublic}
      {@render children()}
    {:else}
      <p class="p-8 text-center text-ink-muted">{de.common.loading}</p>
    {/if}
  </main>
{:else}
  <div class="min-h-dvh md:flex">
    <!-- Desktop sidebar -->
    <nav
      class="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-line bg-surface p-3 md:flex"
      aria-label={de.nav.mainNav}
    >
      <a href="/" class="mb-3 px-3 py-2 text-lg font-bold text-brand-700">{de.appName}</a>
      <a href="/neu" class="btn-primary mb-3">{de.nav.new}</a>
      {#each [...primary, ...secondary] as item (item.href)}
        <a
          href={item.href}
          class="flex min-h-touch items-center justify-between rounded-lg px-3 font-medium {active(item.href)
            ? 'bg-brand-50 text-brand-700'
            : 'text-ink hover:bg-surface-muted'}"
          aria-current={active(item.href) ? 'page' : undefined}
        >
          {item.label}
          {#if 'badge' in item && item.badge && app.me.openCount > 0}
            <span
              class="rounded-full bg-status-pending px-2 text-xs font-bold text-white"
              data-testid="open-badge">{app.me.openCount}</span
            >
          {/if}
        </a>
      {/each}
    </nav>

    <main
      id="main"
      class="mx-auto w-full max-w-5xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28 md:pb-8"
    >
      {@render children()}
    </main>

    <!-- Mobile: floating "+ Neu" and bottom navigation -->
    {#if !page.url.pathname.startsWith('/neu')}<a
        href="/neu"
        class="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex h-14 items-center rounded-full bg-brand-700 px-5 text-base font-bold text-white shadow-lg md:hidden"
        >{de.nav.new}</a
      >{/if}
    <nav
      class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label={de.nav.mainNav}
    >
      {#each primary as item (item.href)}
        <a
          href={item.href}
          class="relative flex min-h-16 flex-col items-center justify-center text-xs font-medium {active(
            item.href,
          )
            ? 'text-brand-700'
            : 'text-ink-muted'}"
          aria-current={active(item.href) ? 'page' : undefined}
        >
          <span class="text-xl leading-none" aria-hidden="true">{item.icon}</span>
          {item.label}
          {#if item.badge && app.me.openCount > 0}
            <span
              class="absolute top-1 right-[calc(50%-1.6rem)] rounded-full bg-status-pending px-1.5 text-[0.7rem] font-bold text-white"
              data-testid="open-badge-mobile">{app.me.openCount}</span
            >
          {/if}
        </a>
      {/each}
      <button
        class="flex min-h-16 flex-col items-center justify-center text-xs font-medium text-ink-muted"
        aria-expanded={moreOpen}
        onclick={() => (moreOpen = !moreOpen)}
      >
        <span class="text-xl leading-none" aria-hidden="true">≡</span>
        {de.nav.more}
      </button>
    </nav>
    {#if moreOpen}
      <div
        class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-line bg-surface p-2 shadow-lg md:hidden"
      >
        {#each secondary as item (item.href)}
          <a
            href={item.href}
            class="flex min-h-touch items-center rounded-lg px-4 font-medium hover:bg-surface-muted"
            >{item.label}</a
          >
        {/each}
      </div>
    {/if}
    <AnswerDialog />
  </div>
{/if}
<Toasts />
