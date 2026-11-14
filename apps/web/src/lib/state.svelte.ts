// SPDX-License-Identifier: AGPL-3.0-or-later
import type { MeDto } from '@ult/shared';
import { api } from './api';

export const app = $state({
  me: null as MeDto | null,
  ready: false,
  native: false,
  /** incremented after every change so pages can reload their data */
  revision: 0,
});

export const toasts = $state<{ id: number; text: string; kind: 'info' | 'error' }[]>([]);
let toastId = 0;

export function toast(text: string, kind: 'info' | 'error' = 'info') {
  const id = ++toastId;
  toasts.push({ id, text, kind });
  setTimeout(() => {
    const i = toasts.findIndex((t) => t.id === id);
    if (i >= 0) toasts.splice(i, 1);
  }, 4000);
}

export async function refreshMe() {
  app.me = await api.me();
  return app.me;
}

export function bumpRevision() {
  app.revision++;
  refreshMe().catch(() => {});
}
