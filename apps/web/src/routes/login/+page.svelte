<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { api } from '$lib/api';
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

  async function devLogin() {
    await api.testLogin();
    await refreshMe();
    goto('/');
  }
</script>

<div class="mx-auto mt-[10vh] max-w-sm">
  <h1 class="h1 text-center text-brand-700">{de.appName}</h1>
  <div class="card flex flex-col gap-4">
    <h2 class="text-lg font-semibold">{de.login.title}</h2>
    <p class="text-ink-muted">{de.login.intro}</p>
    {#if error}
      <p class="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
        {de.login.errors[error] ?? de.common.error}
      </p>
    {/if}
    <a href="/api/auth/github" class="btn-primary" data-sveltekit-reload>{de.login.github}</a>
    {#if githubLogin === false}
      <p class="text-sm text-ink-muted">{de.login.notConfigured}</p>
    {/if}
    {#if import.meta.env.DEV || import.meta.env.VITE_ENABLE_TEST_LOGIN === 'true'}
      <button class="btn-secondary" onclick={devLogin}>{de.login.devLogin}</button>
    {/if}
  </div>
  <p class="mt-6 text-center text-sm"><a class="underline" href="/ueber">{de.nav.about}</a></p>
</div>
