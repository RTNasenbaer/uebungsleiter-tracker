// SPDX-License-Identifier: AGPL-3.0-or-later
/** Classes shared by TextField / Select / TextArea. */
export const controlClass =
  'min-h-12 w-full min-w-0 rounded-sm border-hl border-line-strong bg-surface px-3 text-base text-fg ' +
  'placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50 ' +
  'aria-[invalid=true]:border-danger transition-press';

export function describedBy(id: string, help?: string, error?: string | null) {
  if (error) return `${id}-error`;
  if (help) return `${id}-help`;
  return undefined;
}
