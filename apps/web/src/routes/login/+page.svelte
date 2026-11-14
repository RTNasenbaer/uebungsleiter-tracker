<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { api } from '$lib/api';
  import CircleAlert from 'lucide-svelte/icons/circle-alert';
  import FieldLines from '$lib/components/brand/FieldLines.svelte';
  import GithubMark from '$lib/components/brand/GithubMark.svelte';
  import Logo from '$lib/components/brand/Logo.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { de } from '$lib/i18n/de';
  import { refreshMe } from '$lib/state.svelte';

  let githubLogin = $state<boolean | null>(null);
  const error = $derived(page.url.searchParams.get('error'));

  $effect(() => {
    api
      .meta()
      .then((m) => (githubLogin = m.githubLogin))
      .catch(() => (githubLogin = false));
    // already logged in?
    refreshMe()
      .then(() => goto('/'))
      .catch(() => {});
  });

  let devBusy = $state(false);
  async function devLogin() {
    devBusy = true;
    await api.testLogin();
    await refreshMe();
    goto('/');
  }
</script>

<div class="relative flex min-h-[calc(100dvh-3rem)] items-center justify-center overflow-hidden py-8">
  <FieldLines
    class="pointer-events-none absolute top-1/2 left-1/2 h-auto w-[max(36rem,min(56rem,100%))] -translate-1/2 text-line"
  />
  <div class="relative w-full max-w-sm rounded-md border-hl border-line bg-surface p-6 shadow-float md:p-8">
    <div class="mb-6 flex flex-col items-center gap-3 text-center">
      <Logo size={64} />
      <h1 class="font-score text-3xl font-bold">{de.appName}</h1>
      <p class="text-muted">{de.login.tagline}</p>
    </div>
    <div class="flex flex-col gap-3">
      <p class="text-sm text-muted">{de.login.intro}</p>
      {#if error}
        <p
          class="flex items-start gap-2 rounded-sm border-hl border-danger p-3 text-sm font-medium text-danger"
          role="alert"
        >
          <CircleAlert size={18} strokeWidth={1.75} aria-hidden="true" class="mt-0.5 shrink-0" />
          {de.login.errors[error] ?? de.common.error}
        </p>
      {/if}
      <Button href="/api/auth/github" size="lg" full data-sveltekit-reload>
        <GithubMark size={20} />{de.login.github}</Button
      >
      {#if githubLogin === false}
        <p class="text-sm text-muted">{de.login.notConfigured}</p>
      {/if}
      {#if import.meta.env.DEV || import.meta.env.VITE_ENABLE_TEST_LOGIN === 'true'}
        <Button variant="secondary" full loading={devBusy} onclick={devLogin}>{de.login.devLogin}</Button>
      {/if}
    </div>
  </div>
</div>
<p class="text-center text-sm">
  <a class="inline-flex min-h-12 items-center underline underline-offset-4" href="/ueber">{de.nav.about}</a>
</p>
