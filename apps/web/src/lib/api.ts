// SPDX-License-Identifier: AGPL-3.0-or-later
/** API client: cookie session in the browser, bearer device token inside the Android app. */
import type {
  BackupFile,
  DeviceDto,
  ExceptionDto,
  ExceptionInput,
  ImportResultDto,
  ImportSession,
  MeDto,
  PairingCodeDto,
  SeriesDto,
  SeriesInput,
  SessionDto,
  SessionPatch,
  SettingsDto,
  SettingsInput,
  SingleSessionInput,
} from '@ult/shared';
import type { AlarmEntry } from '@ult/shared';
import { isNative } from './native/platform';
import { type AlarmSettings, type NativeAuth, TrainingAlarm } from './native/trainingAlarm';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const mutationListeners = new Set<() => void>();
/** called after every successful non-GET request (alarm re-sync, badge refresh) */
export function onMutation(fn: () => void): () => void {
  mutationListeners.add(fn);
  return () => mutationListeners.delete(fn);
}

let nativeAuth: NativeAuth = { token: null, baseUrl: null, deviceId: null };
export const APP_VERSION = '0.1.0';

export async function initApi(): Promise<NativeAuth> {
  if (isNative()) nativeAuth = await TrainingAlarm.getAuth();
  return nativeAuth;
}

export function setNativeAuth(auth: NativeAuth) {
  nativeAuth = auth;
}

export function isPaired(): boolean {
  return !!nativeAuth.token;
}

function base(): string {
  return isNative() ? (nativeAuth.baseUrl ?? '').replace(/\/$/, '') : '';
}

/** e2e tests freeze the browser clock; this header lets the (test-mode) server use the same time */
function testNowHeader(): Record<string, string> {
  try {
    if (localStorage.getItem('ult:test-now') === '1') return { 'x-test-now': new Date().toISOString() };
  } catch {
    /* storage unavailable */
  }
  return {};
}

export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  baseOverride?: string,
): Promise<T> {
  const headers: Record<string, string> = { ...testNowHeader() };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (isNative()) {
    headers['x-app-version'] = APP_VERSION;
    if (nativeAuth.token) headers.authorization = `Bearer ${nativeAuth.token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${baseOverride ?? base()}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: isNative() ? 'omit' : 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'Keine Verbindung zum Server.');
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      msg = ((await res.json()) as { error?: string }).error ?? msg;
    } catch {
      /* not json */
    }
    throw new ApiError(res.status, msg);
  }
  const data = (await res.json()) as T;
  if (method !== 'GET' && !path.startsWith('/api/test/') && path !== '/api/pair') {
    mutationListeners.forEach((fn) => fn());
  }
  return data;
}

const get = <T>(p: string) => request<T>('GET', p);
const post = <T>(p: string, b?: unknown) => request<T>('POST', p, b ?? {});
const put = <T>(p: string, b: unknown) => request<T>('PUT', p, b);
const patch = <T>(p: string, b: unknown) => request<T>('PATCH', p, b);
const del = <T>(p: string) => request<T>('DELETE', p);
const q = (o: Record<string, string>) => new URLSearchParams(o).toString();

export const api = {
  meta: () => get<{ sourceUrl: string; githubLogin: boolean }>('/api/meta'),
  me: () => get<MeDto>('/api/me'),
  logout: () => post<{ ok: true }>('/api/auth/logout'),
  testLogin: () => post<{ userId: string }>('/api/test/login', {}),

  sessions: (from: string, to: string) => get<SessionDto[]>(`/api/sessions?${q({ from, to })}`),
  open: () => get<SessionDto[]>('/api/sessions/open'),
  due: () => get<SessionDto[]>('/api/sessions/due'),
  alarms: () =>
    get<{ isAlarmDevice: boolean; alarms: AlarmEntry[]; settings: AlarmSettings }>('/api/sessions/alarms'),
  createSession: (s: Partial<SingleSessionInput>) => post<SessionDto>('/api/sessions', s),
  patchSession: (id: string, p: SessionPatch) => patch<SessionDto>(`/api/sessions/${id}`, p),
  deleteSession: (id: string) => del<{ ok: true }>(`/api/sessions/${id}`),
  answer: (key: string, status: 'held' | 'not_held' | 'cancelled', note?: string | null) =>
    post<SessionDto>('/api/sessions/answer', { occurrence_key: key, status, ...(note ? { note } : {}) }),
  bulk: (keys: string[], status: 'held' | 'not_held') =>
    post<{ updated: number }>('/api/sessions/bulk', { keys, status }),
  snooze: (key: string, minutes: number) =>
    post<{ snoozedUntil: string }>('/api/sessions/snooze', { occurrence_key: key, minutes }),
  importSessions: (sessions: ImportSession[], onDuplicate: 'skip' | 'overwrite') =>
    post<ImportResultDto>('/api/sessions/import', { sessions, onDuplicate }),

  series: () => get<SeriesDto[]>('/api/series'),
  createSeries: (s: Partial<SeriesInput>) =>
    post<{ series: SeriesDto; createdSessions: number }>('/api/series', s),
  updateSeries: (id: string, s: Partial<SeriesInput>, scope: 'all' | 'following', fromDate?: string) =>
    put<{ series: SeriesDto }>(`/api/series/${id}`, { series: s, scope, fromDate }),
  deleteSeries: (id: string) => del<{ ok: true }>(`/api/series/${id}`),

  exceptions: () => get<ExceptionDto[]>('/api/exceptions'),
  createException: (e: Partial<ExceptionInput>) => post<ExceptionDto>('/api/exceptions', e),
  bulkExceptions: (items: Partial<ExceptionInput>[]) =>
    post<{ created: number; skipped: number }>('/api/exceptions/bulk', { items }),
  deleteException: (id: string) => del<{ ok: true }>(`/api/exceptions/${id}`),

  settings: () => get<SettingsDto>('/api/settings'),
  saveSettings: (s: SettingsInput) => put<SettingsDto>('/api/settings', s),

  devices: () => get<DeviceDto[]>('/api/devices'),
  updateDevice: (id: string, d: { name?: string; isAlarmDevice?: boolean }) =>
    patch<DeviceDto>(`/api/devices/${id}`, d),
  deleteDevice: (id: string) => del<{ ok: true }>(`/api/devices/${id}`),
  pairingCode: () => post<PairingCodeDto>('/api/devices/pairing-code'),
  pair: (baseUrl: string, code: string, name: string) =>
    request<{ token: string; deviceId: string }>(
      'POST',
      '/api/pair',
      { code, name, appVersion: APP_VERSION },
      baseUrl.replace(/\/$/, ''),
    ),

  backup: () => get<BackupFile>('/api/backup'),
  restore: (b: BackupFile) => post<ImportResultDto & { seriesCreated: number }>('/api/backup/restore', b),
};
