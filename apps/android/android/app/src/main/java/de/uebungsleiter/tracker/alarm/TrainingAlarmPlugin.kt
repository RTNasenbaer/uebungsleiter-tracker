// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.Manifest
import android.os.Build
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import de.uebungsleiter.tracker.R
import org.json.JSONObject

/** JS API: apps/web/src/lib/native/trainingAlarm.ts */
@CapacitorPlugin(
    name = "TrainingAlarm",
    permissions = [Permission(strings = [Manifest.permission.POST_NOTIFICATIONS], alias = "notifications")]
)
class TrainingAlarmPlugin : Plugin() {
    override fun load() {
        AlarmNotifications.ensureChannels(context)
        if (AlarmGraph.store(context).isPaired()) SyncWorker.schedulePeriodic(context)
    }

    @PluginMethod
    fun setAlarms(call: PluginCall) {
        val arr = call.getArray("alarms") ?: JSArray()
        val items = AlarmItem.listFromJson(arr)
        val config = call.getObject("settings")?.let { AlarmConfig.fromJson(JSONObject(it.toString())) }
        val count = AlarmGraph.coordinator(context).setAlarms(items, config)
        call.resolve(JSObject().put("scheduled", count))
    }

    @PluginMethod
    fun clearAll(call: PluginCall) {
        AlarmGraph.coordinator(context).clearAll()
        call.resolve()
    }

    @PluginMethod
    fun setAuth(call: PluginCall) {
        val store = AlarmGraph.store(context)
        store.token = call.getString("token")
        store.baseUrl = call.getString("baseUrl")
        store.deviceId = call.getString("deviceId")
        if (store.isPaired()) {
            SyncWorker.schedulePeriodic(context)
            AnswerQueue.scheduleUpload(context)
        } else {
            AlarmGraph.coordinator(context).clearAll()
        }
        call.resolve()
    }

    @PluginMethod
    fun getAuth(call: PluginCall) {
        val store = AlarmGraph.store(context)
        call.resolve(
            JSObject()
                .put("token", store.token ?: JSONObject.NULL)
                .put("baseUrl", store.baseUrl ?: JSONObject.NULL)
                .put("deviceId", store.deviceId ?: JSONObject.NULL)
        )
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        val s = AlarmPermissions.status(context)
        val store = AlarmGraph.store(context)
        call.resolve(
            JSObject()
                .put("available", true)
                .put("notifications", s.notifications)
                .put("fullScreen", s.fullScreen)
                .put("exactAlarms", s.exactAlarms)
                .put("batteryOptimizationIgnored", s.batteryOptimizationIgnored)
                .put("manufacturer", Build.MANUFACTURER)
                .put("sdkInt", Build.VERSION.SDK_INT)
                .put("scheduledCount", store.alarms.size)
                .put("paired", store.isPaired())
        )
    }

    @PluginMethod
    fun getScheduled(call: PluginCall) {
        val alarms = AlarmItem.listToJson(AlarmGraph.store(context).alarms.sortedBy { it.triggerAt })
        call.resolve(JSObject().put("alarms", alarms))
    }

    @PluginMethod
    fun openSetting(call: PluginCall) {
        val kind = call.getString("kind") ?: "app"
        runCatching { context.startActivity(AlarmPermissions.settingsIntent(context, kind)) }
            .onFailure { context.startActivity(AlarmPermissions.settingsIntent(context, "app")) }
        call.resolve()
    }

    @PluginMethod
    fun requestNotificationPermission(call: PluginCall) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            getPermissionState("notifications") == PermissionState.GRANTED
        ) {
            call.resolve(JSObject().put("granted", AlarmPermissions.status(context).notifications))
        } else {
            requestPermissionForAlias("notifications", call, "notificationPermissionCallback")
        }
    }

    @Suppress("UnusedPrivateMember") // invoked by Capacitor via reflection
    @PermissionCallback
    private fun notificationPermissionCallback(call: PluginCall) {
        call.resolve(JSObject().put("granted", getPermissionState("notifications") == PermissionState.GRANTED))
    }

    @PluginMethod
    fun testAlarm(call: PluginCall) {
        val delay = call.getInt("delaySeconds") ?: DEFAULT_TEST_DELAY
        AlarmGraph.coordinator(context).testAlarm(
            delay,
            context.getString(R.string.test_alarm_title),
            context.getString(R.string.test_alarm_subtitle)
        )
        call.resolve()
    }

    @PluginMethod
    fun syncNow(call: PluginCall) {
        SyncWorker.runNow(context)
        AnswerQueue.scheduleUpload(context)
        call.resolve()
    }

    companion object {
        private const val DEFAULT_TEST_DELAY = 60
    }
}
