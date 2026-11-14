// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import java.time.Clock
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId

/** All local times are Europe/Berlin (CLAUDE.md). */
val BERLIN: ZoneId = ZoneId.of("Europe/Berlin")

/** Quiet hours, e.g. 22:00–07:00; alarms inside are moved to the end (same rule as packages/shared). */
data class QuietHours(val start: LocalTime, val end: LocalTime) {
    fun contains(time: LocalTime): Boolean = when {
        start == end -> false
        start < end -> !time.isBefore(start) && time.isBefore(end)
        else -> !time.isBefore(start) || time.isBefore(end)
    }

    fun shift(instant: Instant, zone: ZoneId = BERLIN): Instant {
        val local = instant.atZone(zone)
        val time = local.toLocalTime()
        if (!contains(time)) return instant
        val endDate = if (start > end && !time.isBefore(start)) local.toLocalDate().plusDays(1) else local.toLocalDate()
        return endDate.atTime(end).atZone(zone).toInstant()
    }

    companion object {
        fun parse(start: String, end: String): QuietHours? =
            runCatching { QuietHours(LocalTime.parse(start), LocalTime.parse(end)) }.getOrNull()
    }
}

object AlarmTiming {
    const val REMINDER_DELAY_HOURS = 12L
    const val MAX_REMINDERS = 2
    private const val SECONDS_PER_HOUR = 3600L
    private const val SECONDS_PER_MINUTE = 60L

    /** Snooze: now + minutes (snooze is an explicit user wish, quiet hours do not apply). */
    fun snoozeAt(clock: Clock, minutes: Int): Long =
        clock.instant().plusSeconds(minutes * SECONDS_PER_MINUTE).toEpochMilli()

    /** "Still open" reminder 12 h after ringing, never inside quiet hours (§4.3 step 5). */
    fun reminderAt(clock: Clock, quiet: QuietHours?): Long {
        val at = clock.instant().plusSeconds(REMINDER_DELAY_HOURS * SECONDS_PER_HOUR)
        return (quiet?.shift(at) ?: at).toEpochMilli()
    }
}
