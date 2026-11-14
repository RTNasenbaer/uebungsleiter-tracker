// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AlarmCoordinatorTest {
    private val context = ApplicationProvider.getApplicationContext<android.content.Context>()
    private lateinit var store: AlarmStore
    private lateinit var scheduler: FakeScheduler
    private lateinit var coordinator: AlarmCoordinator

    @Before
    fun setUp() {
        store = AlarmStore(context, PlainCipher())
        store.alarms = emptyList()
        scheduler = FakeScheduler()
        coordinator = AlarmCoordinator(store, scheduler, clockAt("2026-11-10T12:00:00Z"))
    }

    @Test
    fun `schedules only future alarms and persists them`() {
        val n =
            coordinator.setAlarms(
                listOf(
                    item("a", "2026-11-10T18:40:00Z"),
                    item("past", "2026-11-09T18:40:00Z"),
                    item("b", "2026-11-12T18:40:00Z")
                )
            )
        assertEquals(2, n)
        assertEquals(listOf("a", "b"), scheduler.scheduled.keys.toList())
        assertEquals(listOf("a", "b"), store.alarms.map { it.key })
    }

    @Test
    fun `cancels alarms that are no longer in the list`() {
        coordinator.setAlarms(listOf(item("a", "2026-11-10T18:40:00Z"), item("b", "2026-11-12T18:40:00Z")))
        coordinator.setAlarms(listOf(item("b", "2026-11-12T18:40:00Z")))
        assertTrue("a" in scheduler.cancelled)
        assertEquals(listOf("b"), store.alarms.map { it.key })
    }

    @Test
    fun `reschedules after reboot from local storage`() {
        coordinator.setAlarms(listOf(item("a", "2026-11-10T18:40:00Z")))
        val afterBoot = FakeScheduler()
        val n = AlarmCoordinator(store, afterBoot, clockAt("2026-11-10T13:00:00Z")).rescheduleAll()
        assertEquals(1, n)
        assertEquals(setOf("a"), afterBoot.scheduled.keys)
    }

    @Test
    fun `snooze schedules the configured minutes later and survives the next sync`() {
        store.config = AlarmConfig(snoozeMinutes = 30)
        coordinator.setAlarms(listOf(item("a", "2026-11-10T12:00:01Z")))
        val snoozed = coordinator.snooze("a", "", "")
        assertEquals(java.time.Instant.parse("2026-11-10T12:30:00Z").toEpochMilli(), snoozed.triggerAt)
        // the server still lists the original (earlier) time → local snooze wins
        coordinator.setAlarms(listOf(item("a", "2026-11-10T12:00:01Z")))
        assertEquals(snoozed.triggerAt, scheduler.scheduled["a"]!!.triggerAt)
    }

    @Test
    fun `reminders stop after two and keep living when the server no longer lists the session`() {
        store.config = AlarmConfig(quietStart = null, quietEnd = null)
        val first = coordinator.scheduleReminder(item("a", "2026-11-10T11:00:00Z"))!!
        assertEquals(1, first.reminderCount)
        coordinator.setAlarms(emptyList()) // past session → server sends nothing
        assertEquals(setOf("a"), scheduler.scheduled.keys)
        val second = coordinator.scheduleReminder(first)!!
        assertEquals(2, second.reminderCount)
        assertNull(coordinator.scheduleReminder(second))
        assertTrue(store.alarms.isEmpty())
    }

    @Test
    fun `test alarm fires after the given delay`() {
        val t = coordinator.testAlarm(60, "Test", "")
        assertEquals(java.time.Instant.parse("2026-11-10T12:01:00Z").toEpochMilli(), t.triggerAt)
        assertEquals(AlarmCoordinator.TEST_KEY, scheduler.scheduled.keys.single())
    }

    @Test
    fun `clearAll cancels everything`() {
        coordinator.setAlarms(listOf(item("a", "2026-11-10T18:40:00Z")))
        coordinator.clearAll()
        assertTrue(scheduler.scheduled.isEmpty())
        assertTrue(store.alarms.isEmpty())
    }

    @Test
    fun `token is stored encrypted`() {
        store.token = "secret-token"
        val raw = context.getSharedPreferences("training_alarm", 0).getString("token", null)
        assertEquals("plain:secret-token", raw)
        assertEquals("secret-token", store.token)
    }
}
