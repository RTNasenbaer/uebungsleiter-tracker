// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat

/** Status checks + intents for the setup page (§5 "Alarm-Einrichtung"). */
object AlarmPermissions {
    data class Status(
        val notifications: Boolean,
        val fullScreen: Boolean,
        val exactAlarms: Boolean,
        val batteryOptimizationIgnored: Boolean
    )

    fun status(context: Context): Status {
        val nm = context.getSystemService(NotificationManager::class.java)
        val am = context.getSystemService(AlarmManager::class.java)
        val pm = context.getSystemService(PowerManager::class.java)
        return Status(
            notifications = NotificationManagerCompat.from(context).areNotificationsEnabled(),
            fullScreen = if (Build.VERSION.SDK_INT >=
                Build.VERSION_CODES.UPSIDE_DOWN_CAKE
            ) {
                nm.canUseFullScreenIntent()
            } else {
                true
            },
            exactAlarms = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) am.canScheduleExactAlarms() else true,
            batteryOptimizationIgnored = pm.isIgnoringBatteryOptimizations(context.packageName)
        )
    }

    @SuppressLint("BatteryLife") // sideload alarm app: exemption is the documented fix for killed alarms
    fun settingsIntent(context: Context, kind: String): Intent {
        val pkg = Uri.parse("package:${context.packageName}")
        return when (kind) {
            "notifications" ->
                Intent(
                    Settings.ACTION_APP_NOTIFICATION_SETTINGS
                ).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
            "fullScreen" ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, pkg)
                } else {
                    Intent(
                        Settings.ACTION_APP_NOTIFICATION_SETTINGS
                    ).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                }
            "exactAlarms" ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, pkg)
                } else {
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg)
                }
            "battery" -> Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, pkg)
            "dontkillmyapp" ->
                Intent(Intent.ACTION_VIEW, Uri.parse("https://dontkillmyapp.com/${Build.MANUFACTURER.lowercase()}"))
            else -> Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg)
        }.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
}
