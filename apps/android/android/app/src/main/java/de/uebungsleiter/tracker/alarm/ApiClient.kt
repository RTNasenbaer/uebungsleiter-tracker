// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import de.uebungsleiter.tracker.BuildConfig
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import org.json.JSONObject

class ApiException(val status: Int, message: String) : Exception(message)

/** Minimal HTTP client for the native side (Bearer device token, JSON). */
class ApiClient(private val baseUrl: String, private val token: String) {
    data class Status(val answered: Boolean, val status: String, val snoozedUntil: String?)

    data class AlarmsResponse(val isAlarmDevice: Boolean, val alarms: List<AlarmItem>, val config: AlarmConfig)

    fun status(key: String, timeoutMs: Int): Status {
        val o = request("GET", "/api/sessions/status?key=${URLEncoder.encode(key, "UTF-8")}", null, timeoutMs)
        return Status(
            o.optBoolean("answered"),
            o.optString("status"),
            if (o.isNull("snoozedUntil")) null else o.optString("snoozedUntil")
        )
    }

    fun alarms(days: Int = DEFAULT_DAYS): AlarmsResponse {
        val o = request("GET", "/api/sessions/alarms?days=$days", null, DEFAULT_TIMEOUT_MS)
        return AlarmsResponse(
            isAlarmDevice = o.optBoolean("isAlarmDevice"),
            alarms = AlarmItem.listFromJson(o.optJSONArray("alarms")),
            config = AlarmConfig.fromJson(o.optJSONObject("settings"))
        )
    }

    fun answer(answer: PendingAnswer) {
        request("POST", "/api/sessions/answer", answer.toJson(), DEFAULT_TIMEOUT_MS)
    }

    private fun request(method: String, path: String, body: JSONObject?, timeoutMs: Int): JSONObject {
        val conn = URL(baseUrl.trimEnd('/') + path).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = method
            conn.connectTimeout = timeoutMs
            conn.readTimeout = timeoutMs
            conn.setRequestProperty("Authorization", "Bearer $token")
            conn.setRequestProperty("Accept", "application/json")
            conn.setRequestProperty("X-App-Version", BuildConfig.VERSION_NAME)
            if (body != null) {
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")
                conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            val code = conn.responseCode
            val stream = if (code in HTTP_OK_RANGE) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (code !in HTTP_OK_RANGE) throw ApiException(code, text.take(MAX_ERROR_CHARS))
            return if (text.isBlank()) JSONObject() else JSONObject(text)
        } finally {
            conn.disconnect()
        }
    }

    companion object {
        const val DEFAULT_DAYS = 14
        const val DEFAULT_TIMEOUT_MS = 15_000
        const val ONLINE_CHECK_TIMEOUT_MS = 3_000
        private val HTTP_OK_RANGE = 200..299
        private const val MAX_ERROR_CHARS = 200

        fun from(store: AlarmStore): ApiClient? {
            val url = store.baseUrl ?: return null
            val token = store.token ?: return null
            return ApiClient(url, token)
        }
    }
}
