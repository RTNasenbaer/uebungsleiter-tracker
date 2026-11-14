// SPDX-License-Identifier: AGPL-3.0-or-later
/** Hands the upcoming alarms to the native plugin (only on the alarm device, §4.3 step 1). */
import { api } from '../api';
import { isNative } from './platform';
import { TrainingAlarm } from './trainingAlarm';

let timer: ReturnType<typeof setTimeout> | null = null;

export async function syncAlarms(): Promise<number> {
  if (!isNative()) return 0;
  const res = await api.alarms();
  if (!res.isAlarmDevice) {
    await TrainingAlarm.clearAll();
    return 0;
  }
  const { scheduled } = await TrainingAlarm.setAlarms({ alarms: res.alarms, settings: res.settings });
  return scheduled;
}

/** debounced – called after every change */
export function scheduleAlarmSync() {
  if (!isNative()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    syncAlarms().catch(() => {
      /* offline – the native SyncWorker retries every 6 h */
    });
  }, 800);
}
