// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Closing a Dialog pops its history entry asynchronously. Opening the next dialog before that popstate
 * would let the pop close the new dialog – so wait for it (or give up after a short timeout).
 */
export function afterDialogClosed(timeoutMs = 400): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      window.removeEventListener('popstate', done);
      // let SvelteKit update page.state first
      setTimeout(resolve, 0);
    };
    const timer = setTimeout(done, timeoutMs);
    window.addEventListener('popstate', done, { once: true });
  });
}
