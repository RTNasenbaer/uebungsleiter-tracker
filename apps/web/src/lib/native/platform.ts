// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor } from '@capacitor/core';

/** true inside the Android app (Capacitor), false in a normal browser */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}
