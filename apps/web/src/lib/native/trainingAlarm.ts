// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * JS side of the native Kotlin plugin "TrainingAlarm" (apps/android).
 * In a normal browser every call is a no-op so the web app keeps working.
 */
import { registerPlugin } from '@capacitor/core';
import type { AlarmEntry } from '@ult/shared';

export interface AlarmSettings {
  ringSeconds: number;
  vibrate: boolean;
  sound: string | null;
  snoozeMinutes: number;
  quietStart: string | null;
  quietEnd: string | null;
  reportDeadline: string;
}

export type SettingKind = 'notifications' | 'fullScreen' | 'exactAlarms' | 'battery' | 'dontkillmyapp';

export interface AlarmStatus {
  available: boolean;
  notifications: boolean;
  fullScreen: boolean;
  exactAlarms: boolean;
  batteryOptimizationIgnored: boolean;
  manufacturer: string;
  sdkInt: number;
  scheduledCount: number;
  paired: boolean;
}

export interface NativeAuth {
  token: string | null;
  baseUrl: string | null;
  deviceId: string | null;
}

export interface TrainingAlarmPlugin {
  setAlarms(options: { alarms: AlarmEntry[]; settings: AlarmSettings }): Promise<{ scheduled: number }>;
  clearAll(): Promise<void>;
  setAuth(options: NativeAuth): Promise<void>;
  getAuth(): Promise<NativeAuth>;
  getStatus(): Promise<AlarmStatus>;
  getScheduled(): Promise<{ alarms: AlarmEntry[] }>;
  openSetting(options: { kind: SettingKind }): Promise<void>;
  requestNotificationPermission(): Promise<{ granted: boolean }>;
  testAlarm(options: { delaySeconds: number }): Promise<void>;
  /** runs the native SyncWorker now (fetch alarms + flush answer queue) */
  syncNow(): Promise<void>;
}

const webFallback: TrainingAlarmPlugin = {
  async setAlarms() {
    return { scheduled: 0 };
  },
  async clearAll() {},
  async setAuth() {},
  async getAuth() {
    return { token: null, baseUrl: null, deviceId: null };
  },
  async getStatus() {
    return {
      available: false,
      notifications: false,
      fullScreen: false,
      exactAlarms: false,
      batteryOptimizationIgnored: false,
      manufacturer: '',
      sdkInt: 0,
      scheduledCount: 0,
      paired: false,
    };
  },
  async getScheduled() {
    return { alarms: [] };
  },
  async openSetting() {},
  async requestNotificationPermission() {
    return { granted: false };
  },
  async testAlarm() {},
  async syncNow() {},
};

export const TrainingAlarm = registerPlugin<TrainingAlarmPlugin>('TrainingAlarm', {
  web: () => webFallback,
});
