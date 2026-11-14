---
name: android-alarm
description: Technische Referenz für das native Kotlin-Capacitor-Plugin "TrainingAlarm" (Vollbild-Alarm über dem Sperrbildschirm wie eine Wecker-App, exakte Alarme, Neustart-Festigkeit, Antwort-Warteschlange). Nutzen, bevor Code in apps/android geschrieben oder geändert wird oder wenn Alarme nicht zuverlässig auslösen.
---

# android-alarm

Die App wird **nicht** über den Play Store verteilt (Sideload-APK über GitHub Releases). Dadurch sind die Play-Richtlinien
für Wecker-Berechtigungen irrelevant, die Android-Laufzeitregeln aber nicht. Vor Umsetzung die aktuelle Doku auf
developer.android.com prüfen (Exact alarms, Full-screen intents, Foreground/Background-Limits).

## Ziel-Setup
- `minSdk 26`, `targetSdk` = aktuellste stabile API, Kotlin, keine Jetpack-Compose-Pflicht (AlarmActivity darf Compose nutzen).
- Capacitor-Plugin `TrainingAlarm` in `apps/android/app/src/main/java/.../alarm/` (Kotlin): `AlarmScheduler` (Interface, in Tests faken),
  `AlarmReceiver`, `BootReceiver`, `AlarmActivity`, `AlarmNotifications`, `AnswerQueue` (Room), `AnswerUploadWorker`, `SyncWorker`,
  `AlarmPermissions`. JS-Wrapper + Typen in `apps/web/src/lib/native/trainingAlarm.ts` mit Web-Fallback (No-op).
- Plugin-Methoden: `setAlarms`, `clearAll`, `setAuth(token, baseUrl)`, `getStatus`, `openSetting(kind)`, `testAlarm(delaySeconds)`.

## Manifest
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>          <!-- Android 13+ Laufzeit-Anfrage -->
<uses-permission android:name="android.permission.USE_EXACT_ALARM"/>             <!-- API 33+, install-time -->
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" android:maxSdkVersion="32"/>
<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT"/>      <!-- Android 14+: Nutzer kann es entziehen -->
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
<uses-permission android:name="android.permission.VIBRATE"/>
<uses-permission android:name="android.permission.WAKE_LOCK"/>
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"/>
<uses-permission android:name="android.permission.CAMERA"/>                      <!-- QR-Pairing -->
<uses-permission android:name="android.permission.INTERNET"/>
```
`AlarmActivity`: `android:showWhenLocked="true" android:turnScreenOn="true" android:excludeFromRecents="true"
android:launchMode="singleInstance"`; zusätzlich zur Laufzeit `setShowWhenLocked(true)`, `setTurnScreenOn(true)`,
`KeyguardManager.requestDismissKeyguard` nur wenn Nutzer „Notiz“ tippt.

## Ablauf
1. `setAlarms(list)` → für jeden Eintrag `AlarmManager.setAlarmClock(AlarmClockInfo(triggerAt, showIntent), operation)`;
   `requestCode` stabil aus `occurrence_key.hashCode()`; Liste in Room oder DataStore persistieren; alte, nicht mehr enthaltene Alarme canceln.
2. `AlarmReceiver.onReceive` → `goAsync()`; ≤3 s Online-Check `GET /api/sessions/status?key=…` mit Device-Token;
   beantwortet/abgesagt → beenden. Sonst Notification auf Kanal `training_alarm` (IMPORTANCE_HIGH, Kategorie `CATEGORY_ALARM`,
   `setFullScreenIntent(pendingIntent, true)`, `setOngoing(true)`, Aktionen Ja/Nein/Später).
3. `AlarmActivity` spielt Ton über `AudioAttributes.USAGE_ALARM` (respektiert Wecker-Lautstärke, nicht Medien), vibriert, stoppt nach N s.
4. Antwort → `AnswerQueue` (Room) → `WorkManager` OneTimeWork (`NetworkType.CONNECTED`, Backoff) → `POST /api/sessions/answer`.
5. „Später“ → neuer `setAlarmClock` in `snooze_minutes`.
6. `BootReceiver` (BOOT_COMPLETED, LOCKED_BOOT_COMPLETED optional, TIME_SET, TIMEZONE_CHANGED, MY_PACKAGE_REPLACED) → alles neu planen.
7. Periodischer `SyncWorker` (6 h) holt Termine und plant neu – auch wenn die App nie geöffnet wird.

## Berechtigungs-Checks (für die Einrichtungsseite, Methode `getStatus()`)
- `NotificationManagerCompat.areNotificationsEnabled()`
- `NotificationManager.canUseFullScreenIntent()` (API 34+) → sonst Intent `Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT`
- `AlarmManager.canScheduleExactAlarms()` (API 31+) → sonst `Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM`
- `PowerManager.isIgnoringBatteryOptimizations()` → `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`
- Hersteller-Hinweis (Samsung/Xiaomi/OnePlus) mit Link auf dontkillmyapp.com
- `testAlarm(delaySeconds)` für „Test-Alarm in 1 Minute“.
Fehlt Full-Screen-Recht: Fallback = Heads-up-Notification mit Ton auf Alarm-Kanal (funktioniert trotzdem, nur nicht vollflächig).

## Sicherheit
Device-Token Keystore-verschlüsselt in DataStore (Tink oder AndroidX Security); nie loggen. Base-URL per Build-Config.
Release-Signing über `keystore.properties` (gitignored) bzw. GitHub-Secrets im CI.

## Tests
- **JVM (Robolectric, lokal, Pflicht):** AlarmActivity + Einrichtungsseite als Roborazzi-Screenshots (hell/dunkel, Pixel-Größe) –
  PNGs mit dem Read-Tool ansehen.
  Außerdem: Planung erzeugt korrekte `AlarmClockInfo`-Zeiten (inkl. DST), Cancel nicht mehr
  enthaltener Alarme, Ruhezeit-Verschiebung, BootReceiver plant neu, Notification hat FullScreenIntent + Kategorie Alarm,
  AnswerQueue + Worker (WorkManager-Testing-Artifact), Snooze.
- **Instrumented (CI-Emulator, `reactivecircus/android-emulator-runner`, API 34 + API 35):** UI-Automator-Test:
  Gerät sperren → `testAlarm(5)` → prüfen, dass `AlarmActivity` über dem Sperrbildschirm sichtbar ist → „JA“ tippen →
  Request an Mock-Server (MockWebServer) prüfen. Berechtigung im Test per
  `adb shell appops set <pkg> USE_FULL_SCREEN_INTENT allow` bzw. `pm grant … POST_NOTIFICATIONS`.
- Lokaler Emulator nur, wenn `/dev/kvm` existiert – sonst CI nutzen, nicht den Menschen fragen.
