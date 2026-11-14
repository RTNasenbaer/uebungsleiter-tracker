// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Test

class AlarmDisplayTest {
    private val clock = clockAt("2026-11-10T18:40:00Z")

    @Test
    fun `splits the server subtitle into date, time and place`() {
        val item = AlarmItem(
            "s1:2026-11-10",
            Instant.parse("2026-11-10T18:40:00Z").toEpochMilli(),
            "U12 Training gehalten?",
            "Di, 10.11. · 18:00–19:30 · Sporthalle Mitte"
        )
        assertEquals(
            AlarmDisplay("U12 TRAINING", "Di, 10.11.", "18:00–19:30", "Sporthalle Mitte"),
            AlarmDisplay.from(item, clock)
        )
    }

    @Test
    fun `keeps older two-part subtitles`() {
        val display = AlarmDisplay.from(item("k", "2026-11-10T18:40:00Z"), clock)
        assertEquals("Di, 10.11.2026", display.date)
        assertEquals("bis 19:30", display.time)
        assertEquals("", display.location)
    }

    @Test
    fun `falls back to the trigger time in Berlin for the test alarm`() {
        val item = AlarmItem(
            AlarmCoordinator.TEST_KEY,
            Instant.parse("2026-03-29T01:30:00Z").toEpochMilli(), // after the switch to CEST
            "Test-Alarm",
            "So sieht der Alarm nach dem Training aus."
        )
        assertEquals(
            AlarmDisplay("TEST-ALARM", "So, 29.03.", "03:30", "So sieht der Alarm nach dem Training aus."),
            AlarmDisplay.from(item, clock)
        )
    }
}
