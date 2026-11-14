// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import java.time.Clock
import java.time.Instant
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Splits an alarm entry into the lines of the alarm screen (DESIGN.md §7).
 * The server sends `title = "U12 Training gehalten?"` and `subtitle = "Di, 10.11. · 18:00–19:30 · Halle"`;
 * older or test entries (one part only) fall back to the trigger time.
 */
data class AlarmDisplay(val label: String, val date: String, val time: String, val location: String) {
    companion object {
        private const val QUESTION_SUFFIX = " gehalten?"
        private const val SEPARATOR = " · "
        private val WEEKDAYS = listOf("Mo", "Di", "Mi", "Do", "Fr", "Sa", "So")
        private val DAY_MONTH = DateTimeFormatter.ofPattern("dd.MM.")
        private val HOURS = DateTimeFormatter.ofPattern("HH:mm")

        fun from(item: AlarmItem, clock: Clock): AlarmDisplay {
            val label = item.title.removeSuffix(QUESTION_SUFFIX).trim().uppercase(Locale.GERMAN)
            val parts = item.subtitle.split(SEPARATOR).map { it.trim() }.filter { it.isNotEmpty() }
            if (parts.size >= 2) {
                return AlarmDisplay(label, parts[0], parts[1], parts.drop(2).joinToString(SEPARATOR))
            }
            val at = Instant.ofEpochMilli(item.triggerAt.takeIf { it > 0 } ?: clock.millis()).atZone(BERLIN)
            val date = "${WEEKDAYS[at.dayOfWeek.value - 1]}, ${at.format(DAY_MONTH)}"
            return AlarmDisplay(label, date, at.format(HOURS), parts.firstOrNull().orEmpty())
        }
    }
}
