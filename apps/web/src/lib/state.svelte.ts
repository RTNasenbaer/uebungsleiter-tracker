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

export interface ToastAction {
  label: string;
  run: () => void | Promise<void>;
}
export const toasts = $state<
  { id: number; text: string; kind: 'info' | 'error'; action?: ToastAction | undefined }[]
>([]);
let toastId = 0;

export function dismissToast(id: number) {
  const i = toasts.findIndex((t) => t.id === id);
  if (i >= 0) toasts.splice(i, 1);
}

/** Shows a toast for 4 s (6 s with an undo action). */
export function toast(text: string, kind: 'info' | 'error' = 'info', action?: ToastAction) {
  const id = ++toastId;
  toasts.push({ id, text, kind, action });
  setTimeout(() => dismissToast(id), action ? 6000 : 4000);
}

export async function refreshMe() {
  app.me = await api.me();
  return app.me;
}

export function bumpRevision() {
  app.revision++;
  refreshMe().catch(() => {});
}
