<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Feldlinie: 1.5 px line with a small orange centre mark (DESIGN.md §4). -->
<script lang="ts">
  let { class: klass = '' }: { class?: string } = $props();
</script>

<div class="relative h-[var(--hl-size-line)] bg-line {klass}" aria-hidden="true">
  <span class="absolute top-1/2 left-1/2 h-2 w-[var(--hl-size-line)] -translate-1/2 bg-court"></span>
</div>
