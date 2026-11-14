// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Shadows.shadowOf

@RunWith(AndroidJUnit4::class)
class AndroidAlarmSchedulerTest {
    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val alarmManager = context.getSystemService(AlarmManager::class.java)

    @Before
    fun setUp() {
        AlarmGraph.cipherFactory = { PlainCipher() }
        AlarmGraph.clock = clockAt("2026-11-10T12:00:00Z")
        AlarmGraph.store(context).alarms = emptyList()
    }

    @After
    fun tearDown() = AlarmGraph.reset()

    @Test
    fun `uses setAlarmClock with the exact trigger time`() {
        val scheduler = AndroidAlarmScheduler(context)
        scheduler.schedule(item("s1:2026-11-10", "2026-11-10T18:40:00Z"))
        val info = alarmManager.nextAlarmClock
        assertNotNull(info)
        assertEquals(java.time.Instant.parse("2026-11-10T18:40:00Z").toEpochMilli(), info!!.triggerTime)
        val scheduled = shadowOf(alarmManager).nextScheduledAlarm!!
        val fired = shadowOf(scheduled.operation).savedIntent
        assertEquals(AlarmReceiver.ACTION_FIRE, fired.action)
        assertEquals("s1:2026-11-10", fired.getStringExtra(AlarmReceiver.EXTRA_KEY))
    }

    @Test
    fun `cancel removes the alarm`() {
        val scheduler = AndroidAlarmScheduler(context)
        scheduler.schedule(item("x", "2026-11-10T18:40:00Z"))
        scheduler.cancel("x")
        assertNull(shadowOf(alarmManager).nextScheduledAlarm)
    }

    @Test
    fun `boot receiver schedules stored alarms again`() {
        AlarmGraph.store(context).alarms =
            listOf(item("a", "2026-11-10T18:40:00Z"), item("old", "2026-11-09T18:40:00Z"))
        BootReceiver().onReceive(context, Intent(Intent.ACTION_BOOT_COMPLETED))
        assertEquals(1, shadowOf(alarmManager).scheduledAlarms.size)
        assertEquals(listOf("a"), AlarmGraph.store(context).alarms.map { it.key })
    }

    @Test
    fun `boot receiver ignores unrelated broadcasts`() {
        AlarmGraph.store(context).alarms = listOf(item("a", "2026-11-10T18:40:00Z"))
        BootReceiver().onReceive(context, Intent(Intent.ACTION_SCREEN_ON))
        assertEquals(0, shadowOf(alarmManager).scheduledAlarms.size)
    }
}
