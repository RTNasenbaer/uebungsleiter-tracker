<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import '../app.css';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { ApiError, initApi, isPaired, onMutation } from '$lib/api';
  import AnswerDialog from '$lib/components/AnswerDialog.svelte';
  import NavBar from '$lib/components/nav/NavBar.svelte';
  import NavRail from '$lib/components/nav/NavRail.svelte';
  import Sidebar from '$lib/components/nav/Sidebar.svelte';
  import { isActive, moreItems, open as openItem, series as seriesItem } from '$lib/components/nav/items';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import Spinner from '$lib/components/ui/Spinner.svelte';
  import Toaster from '$lib/components/ui/Toaster.svelte';
  import { de } from '$lib/i18n/de';
  import { isNative } from '$lib/native/platform';
  import { scheduleAlarmSync, syncAlarms } from '$lib/native/sync';
  import { app, refreshMe } from '$lib/state.svelte';
  import { initTheme } from '$lib/theme.svelte';

  let { children } = $props();

  const PUBLIC = ['/login', '/koppeln', '/ueber'];
  const isPublic = $derived(PUBLIC.some((p) => page.url.pathname.startsWith(p)));
  /** "Über" is public, but logged-in users keep their navigation */
  const bare = $derived(!app.me || (isPublic && !page.url.pathname.startsWith('/ueber')));
  let moreOpen = $state(false);
  let moreFrom = $state<'bar' | 'rail'>('bar');

  const allMore = $derived(moreItems(app.native));
  const more = $derived(
    moreFrom === 'rail' ? allMore.filter((i) => i !== openItem && i !== seriesItem) : allMore,
  );
  const moreActive = $derived(allMore.some((i) => isActive(page.url.pathname, i.href)));

  function openMore(from: 'bar' | 'rail') {
    moreFrom = from;
    moreOpen = true;
  }

  $effect(() => initTheme());

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
    // close the "more" sheet after navigation
    void page.url.pathname;
    moreOpen = false;
  });
</script>

<a
  href="#main"
  class="sr-only rounded-sm bg-surface px-4 py-3 font-semibold focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
  >{de.common.skipToContent}</a
>

{#if bare}
  <main
    id="main"
    class="mx-auto min-h-dvh w-full max-w-content px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-8"
  >
    {#if app.ready || isPublic}
      {@render children()}
    {:else}
      <div class="flex min-h-[60dvh] items-center justify-center text-muted"><Spinner size={32} /></div>
    {/if}
  </main>
{:else}
  <div class="min-h-dvh md:flex">
    <Sidebar />
    <NavRail onmore={() => openMore('rail')} moreOpen={moreOpen && moreFrom === 'rail'} {moreActive} />

    <main
      id="main"
      class="mx-auto w-full max-w-content min-w-0 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:px-8 md:pt-8 md:pb-12"
    >
      {@render children()}
    </main>

    <NavBar onmore={() => openMore('bar')} moreOpen={moreOpen && moreFrom === 'bar'} {moreActive} />

    <Dialog bind:open={moreOpen} title={de.nav.more}>
      <ul class="-mx-2 flex flex-col">
        {#each more as item (item.href)}
          {@const active = isActive(page.url.pathname, item.href)}
          <li>
            <a
              href={item.href}
              class="flex min-h-13 items-center gap-4 rounded-sm px-3 text-lg font-medium {active
                ? 'bg-surface-sunken'
                : 'hover:bg-surface-sunken'}"
              aria-current={active ? 'page' : undefined}
            >
              <item.icon size={24} strokeWidth={1.75} class="text-muted" />
              {item.label}
            </a>
          </li>
        {/each}
      </ul>
    </Dialog>
    <AnswerDialog />
  </div>
{/if}
<Toaster />
