// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.ListenableWorker
import androidx.work.testing.TestListenableWorkerBuilder
import java.time.LocalDate
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class SyncWorkerTest {
    private val context = ApplicationProvider.getApplicationContext<Context>()
    private lateinit var server: MockWebServer
    private val scheduler = FakeScheduler()

    @Before
    fun setUp() {
        server = MockWebServer().apply { start() }
        AlarmGraph.cipherFactory = { PlainCipher() }
        AlarmGraph.schedulerFactory = { scheduler }
        AlarmGraph.clock = clockAt("2026-11-10T12:00:00Z")
        val store = AlarmGraph.store(context)
        store.baseUrl = server.url("/").toString()
        store.token = "t"
        store.alarms = emptyList()
    }

    @After
    fun tearDown() {
        server.shutdown()
        AlarmGraph.reset()
    }

    @Test
    fun `fetches the next 14 days and schedules them on the alarm device`() = runTest {
        server.enqueue(
            MockResponse().setBody(
                """{"isAlarmDevice":true,"alarms":[{"key":"s:2026-11-10","triggerAt":1794426000000,
                    "title":"U12 Training gehalten?","subtitle":"Di"}],"settings":{"ringSeconds":45,"vibrate":false,"sound":null,"snoozeMinutes":20,
                    "quietStart":"22:00","quietEnd":"07:00","reportDeadline":"12-15"}}"""
            )
        )
        val result = TestListenableWorkerBuilder<SyncWorker>(context).build().doWork()
        assertEquals(ListenableWorker.Result.success(), result)
        assertEquals("/api/sessions/alarms?days=14", server.takeRequest().path)
        assertEquals(setOf("s:2026-11-10"), scheduler.scheduled.keys)
        assertEquals(45, AlarmGraph.store(context).config.ringSeconds)
        assertEquals(20, AlarmGraph.store(context).config.snoozeMinutes)
    }

    @Test
    fun `clears alarms when this device is not the alarm device`() = runTest {
        AlarmGraph.store(context).alarms = listOf(item("old", "2026-11-11T18:40:00Z"))
        server.enqueue(MockResponse().setBody("""{"isAlarmDevice":false,"alarms":[],"settings":{}}"""))
        TestListenableWorkerBuilder<SyncWorker>(context).build().doWork()
        assertTrue(AlarmGraph.store(context).alarms.isEmpty())
        assertTrue("old" in scheduler.cancelled)
    }

    @Test
    fun `report reminder window starts 1 December or 14 days before the deadline`() {
        assertNull(SyncWorker.reportReminderDue(LocalDate.of(2026, 11, 30), "12-15"))
        assertEquals(LocalDate.of(2026, 12, 15), SyncWorker.reportReminderDue(LocalDate.of(2026, 12, 1), "12-15"))
        assertEquals(LocalDate.of(2026, 12, 15), SyncWorker.reportReminderDue(LocalDate.of(2026, 12, 15), "12-15"))
        assertNull(SyncWorker.reportReminderDue(LocalDate.of(2026, 12, 16), "12-15"))
        assertEquals(LocalDate.of(2026, 12, 31), SyncWorker.reportReminderDue(LocalDate.of(2026, 12, 1), "12-31"))
        assertEquals(LocalDate.of(2026, 11, 20), SyncWorker.reportReminderDue(LocalDate.of(2026, 11, 6), "11-20"))
    }
}
