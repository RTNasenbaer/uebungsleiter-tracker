<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  import { APP_VERSION } from '$lib/api';
  import { de } from '$lib/i18n/de';

  /** AGPL §13: link to the complete source code */
  const SOURCE_URL =
    import.meta.env.VITE_SOURCE_URL ?? 'https://github.com/RTNasenbaer/uebungsleiter-tracker';
</script>

<h1 class="h1">{de.about.title}</h1>
<div class="card flex flex-col gap-3">
  <p class="text-lg font-semibold">{de.appName}</p>
  <p>{de.about.text}</p>
  <p>{de.about.version}: {APP_VERSION}</p>
  <p>{de.about.license}</p>
  <p>
    {de.about.sourceHint}
    <a
      class="font-medium text-brand-700 underline"
      href={SOURCE_URL}
      target="_blank"
      rel="noopener"
      data-testid="source-link">{SOURCE_URL}</a
    >
  </p>
</div>
