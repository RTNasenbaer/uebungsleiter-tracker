// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Test

class QuietHoursTest {
    private val quiet = QuietHours.parse("22:00", "07:00")!!

    @Test
    fun `alarm in the evening part moves to next morning (Berlin, winter)`() {
        // 22:05 CET → 07:00 CET next day
        assertEquals(Instant.parse("2026-11-11T06:00:00Z"), quiet.shift(Instant.parse("2026-11-10T21:05:00Z")))
    }

    @Test
    fun `alarm in the early morning moves to 07 00 the same day`() {
        assertEquals(Instant.parse("2026-11-10T06:00:00Z"), quiet.shift(Instant.parse("2026-11-10T05:10:00Z")))
    }

    @Test
    fun `alarm outside quiet hours is unchanged`() {
        val t = Instant.parse("2026-11-10T18:40:00Z")
        assertEquals(t, quiet.shift(t))
    }

    @Test
    fun `DST spring forward night shifts to 07 00 CEST`() {
        // 2026-03-29 01:30 UTC = 03:30 CEST (inside quiet) → 07:00 CEST = 05:00 UTC
        assertEquals(Instant.parse("2026-03-29T05:00:00Z"), quiet.shift(Instant.parse("2026-03-29T01:30:00Z")))
    }

    @Test
    fun `DST fall back night shifts to 07 00 CET`() {
        // 2026-10-25 02:30 local (second, CET = 01:30 UTC) → 07:00 CET = 06:00 UTC
        assertEquals(Instant.parse("2026-10-25T06:00:00Z"), quiet.shift(Instant.parse("2026-10-25T01:30:00Z")))
    }

    @Test
    fun `reminder is 12 h later but never in quiet hours`() {
        // ring at 19:40 CET → +12 h = 07:40 next day (outside) ; ring at 15:00 → 03:00 → moved to 07:00
        assertEquals(
            Instant.parse("2026-11-11T06:40:00Z").toEpochMilli(),
            AlarmTiming.reminderAt(clockAt("2026-11-10T18:40:00Z"), quiet)
        )
        assertEquals(
            Instant.parse("2026-11-11T06:00:00Z").toEpochMilli(),
            AlarmTiming.reminderAt(clockAt("2026-11-10T14:00:00Z"), quiet)
        )
    }
}
