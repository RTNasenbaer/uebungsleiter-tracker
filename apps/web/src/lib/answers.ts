// SPDX-License-Identifier: AGPL-3.0-or-later
/** Answering with an undo toast (DESIGN.md §8 Toast). Undo restores the previous status via PATCH. */
import type { SessionDto } from '@ult/shared';
import { api } from './api';
import { de } from './i18n/de';
import { bumpRevision, toast } from './state.svelte';

export async function answerWithUndo(s: SessionDto, status: 'held' | 'not_held', note?: string | null) {
  const previous = s.status;
  const updated = await api.answer(s.occurrenceKey, status, note);
  bumpRevision();
  toast(`${de.answer.done}: ${de.status[status]}`, 'info', {
    label: de.answer.undo,
    run: async () => {
      await api.patchSession(updated.id, { status: previous === 'planned' ? 'planned' : 'pending' });
      toast(de.answer.undone);
      bumpRevision();
    },
  });
  return updated;
}

export async function bulkWithUndo(sessions: SessionDto[], status: 'held' | 'not_held') {
  const { updated } = await api.bulk(
    sessions.map((s) => s.occurrenceKey),
    status,
  );
  bumpRevision();
  toast(de.open.updated(updated), 'info', {
    label: de.answer.undo,
    run: async () => {
      await Promise.all(sessions.map((s) => api.patchSession(s.id, { status: s.status })));
      toast(de.answer.undone);
      bumpRevision();
    },
  });
  return updated;
}
