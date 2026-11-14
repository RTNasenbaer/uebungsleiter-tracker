// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import org.json.JSONArray
import org.json.JSONObject

/** One scheduled alarm (mirrors `AlarmEntry` in packages/shared/src/alarm.ts). */
data class AlarmItem(
    val key: String,
    /** epoch milliseconds */
    val triggerAt: Long,
    val title: String,
    val subtitle: String,
    /** how often the "still open" reminder already fired (max 2) */
    val reminderCount: Int = 0
) {
    fun toJson(): JSONObject = JSONObject()
        .put("key", key)
        .put("triggerAt", triggerAt)
        .put("title", title)
        .put("subtitle", subtitle)
        .put("reminderCount", reminderCount)

    companion object {
        fun fromJson(o: JSONObject) = AlarmItem(
            key = o.getString("key"),
            triggerAt = o.getLong("triggerAt"),
            title = o.optString("title"),
            subtitle = o.optString("subtitle"),
            reminderCount = o.optInt("reminderCount", 0)
        )

        fun listFromJson(arr: JSONArray?): List<AlarmItem> =
            if (arr == null) emptyList() else (0 until arr.length()).map { fromJson(arr.getJSONObject(it)) }

        fun listToJson(items: List<AlarmItem>): JSONArray = JSONArray().also { a ->
            items.forEach { a.put(it.toJson()) }
        }
    }
}

/** Alarm settings from the server (`/api/sessions/alarms` → settings). */
data class AlarmConfig(
    val ringSeconds: Int = DEFAULT_RING_SECONDS,
    val vibrate: Boolean = true,
    val sound: String? = null,
    val snoozeMinutes: Int = DEFAULT_SNOOZE_MINUTES,
    val quietStart: String? = "22:00",
    val quietEnd: String? = "07:00",
    val reportDeadline: String? = "12-15"
) {
    fun toJson(): JSONObject = JSONObject()
        .put("ringSeconds", ringSeconds)
        .put("vibrate", vibrate)
        .put("sound", sound ?: JSONObject.NULL)
        .put("snoozeMinutes", snoozeMinutes)
        .put("quietStart", quietStart ?: JSONObject.NULL)
        .put("quietEnd", quietEnd ?: JSONObject.NULL)
        .put("reportDeadline", reportDeadline ?: JSONObject.NULL)

    val quietHours: QuietHours?
        get() = if (quietStart != null && quietEnd != null) QuietHours.parse(quietStart, quietEnd) else null

    companion object {
        const val DEFAULT_RING_SECONDS = 60
        const val DEFAULT_SNOOZE_MINUTES = 30

        private fun JSONObject.optNullableString(name: String, fallback: String?): String? = when {
            !has(name) -> fallback
            isNull(name) -> null
            else -> getString(name)
        }

        fun fromJson(o: JSONObject?): AlarmConfig {
            if (o == null) return AlarmConfig()
            val d = AlarmConfig()
            return AlarmConfig(
                ringSeconds = o.optInt("ringSeconds", d.ringSeconds),
                vibrate = o.optBoolean("vibrate", d.vibrate),
                sound = o.optNullableString("sound", null),
                snoozeMinutes = o.optInt("snoozeMinutes", d.snoozeMinutes),
                quietStart = o.optNullableString("quietStart", d.quietStart),
                quietEnd = o.optNullableString("quietEnd", d.quietEnd),
                reportDeadline = o.optNullableString("reportDeadline", d.reportDeadline)
            )
        }
    }
}

/** Answer waiting for upload (§4.3 step 6). */
data class PendingAnswer(val key: String, val status: String, val answeredAt: String, val note: String?) {
    fun toJson(): JSONObject = JSONObject()
        .put("occurrence_key", key)
        .put("status", status)
        .put("answered_at", answeredAt)
        .put("note", note ?: JSONObject.NULL)
        .put("via", "alarm")

    companion object {
        fun fromJson(o: JSONObject) = PendingAnswer(
            key = o.getString("occurrence_key"),
            status = o.getString("status"),
            answeredAt = o.getString("answered_at"),
            note = if (o.isNull("note")) null else o.optString("note")
        )
    }
}

object AnswerStatus {
    const val HELD = "held"
    const val NOT_HELD = "not_held"
}
