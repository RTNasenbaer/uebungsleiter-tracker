<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Fine diamond net (DESIGN.md §5) – only for the alarm screen and the in-app question header. -->
<script lang="ts">
  let { class: klass = '', opacity = 0.05 }: { class?: string; opacity?: number } = $props();
  const uid = $props.id();
  const id = `net-${uid}`;
</script>

<svg class="pointer-events-none {klass}" aria-hidden="true" focusable="false" width="100%" height="100%">
  <defs>
    <pattern {id} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <path d="M0 0H14M0 0V14" stroke="currentColor" stroke-width="1.25" fill="none" />
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#{id})" {opacity} />
</svg>
