// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * Local persistence for the plugin: scheduled alarms (needed after reboot), alarm settings,
 * server URL and the device token. The token is encrypted with an Android Keystore key.
 */
class AlarmStore(context: Context, private val cipher: TokenCipher = KeystoreTokenCipher()) {
    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    var alarms: List<AlarmItem>
        get() = AlarmItem.listFromJson(prefs.getString(KEY_ALARMS, null)?.let { JSONArray(it) })
        set(value) = prefs.edit().putString(KEY_ALARMS, AlarmItem.listToJson(value).toString()).apply()

    var config: AlarmConfig
        get() = AlarmConfig.fromJson(prefs.getString(KEY_CONFIG, null)?.let { JSONObject(it) })
        set(value) = prefs.edit().putString(KEY_CONFIG, value.toJson().toString()).apply()

    var baseUrl: String?
        get() = prefs.getString(KEY_BASE_URL, null)
        set(value) = prefs.edit().putString(KEY_BASE_URL, value).apply()

    var deviceId: String?
        get() = prefs.getString(KEY_DEVICE_ID, null)
        set(value) = prefs.edit().putString(KEY_DEVICE_ID, value).apply()

    var token: String?
        get() = prefs.getString(KEY_TOKEN, null)?.let { runCatching { cipher.decrypt(it) }.getOrNull() }
        set(value) =
            prefs
                .edit()
                .apply { if (value == null) remove(KEY_TOKEN) else putString(KEY_TOKEN, cipher.encrypt(value)) }
                .apply()

    /** date (YYYY-MM-DD) the report reminder was last shown */
    var reportReminderShownOn: String?
        get() = prefs.getString(KEY_REPORT_REMINDER, null)
        set(value) = prefs.edit().putString(KEY_REPORT_REMINDER, value).apply()

    var pendingAnswers: List<PendingAnswer>
        get() {
            val arr = prefs.getString(KEY_QUEUE, null)?.let { JSONArray(it) } ?: return emptyList()
            return (0 until arr.length()).map { PendingAnswer.fromJson(arr.getJSONObject(it)) }
        }
        set(value) =
            prefs
                .edit()
                .putString(KEY_QUEUE, JSONArray().also { a -> value.forEach { a.put(it.toJson()) } }.toString())
                .apply()

    fun isPaired(): Boolean = token != null && baseUrl != null

    companion object {
        private const val PREFS = "training_alarm"
        private const val KEY_ALARMS = "alarms"
        private const val KEY_CONFIG = "config"
        private const val KEY_BASE_URL = "base_url"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_TOKEN = "token"
        private const val KEY_QUEUE = "answer_queue"
        private const val KEY_REPORT_REMINDER = "report_reminder"
    }
}
