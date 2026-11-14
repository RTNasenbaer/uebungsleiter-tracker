<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import { APP_VERSION } from '$lib/api';
  import ExternalLink from 'lucide-svelte/icons/external-link';
  import Logo from '$lib/components/brand/Logo.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import { de } from '$lib/i18n/de';
  import { app } from '$lib/state.svelte';

  /** AGPL §13: link to the complete source code */
  const SOURCE_URL =
    import.meta.env.VITE_SOURCE_URL ?? 'https://github.com/RTNasenbaer/uebungsleiter-tracker';
</script>

<PageHeader label={de.appName} title={de.about.title} />
<Card class="flex max-w-form flex-col gap-4">
  <div class="flex items-center gap-4">
    <Logo size={56} />
    <div>
      <p class="font-score text-2xl font-bold">{de.appName}</p>
      <p class="text-sm text-muted">{de.about.version} {APP_VERSION}</p>
    </div>
  </div>
  <p>{de.about.text}</p>
  <p class="text-sm">{de.about.license}</p>
  <div class="flex flex-col gap-1">
    <p class="text-sm text-muted">{de.about.sourceHint}</p>
    <a
      class="inline-flex min-h-12 items-center gap-2 font-semibold break-all text-link underline underline-offset-4"
      href={SOURCE_URL}
      target="_blank"
      rel="noopener"
      data-testid="source-link"
      >{SOURCE_URL}<ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" class="shrink-0" /></a
    >
  </div>
</Card>
{#if !app.me}
  <p class="mt-6 text-sm">
    <a class="inline-flex min-h-12 items-center underline underline-offset-4" href="/login"
      >{de.login.title}</a
    >
  </p>
{/if}
