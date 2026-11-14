// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Shadows.shadowOf

@RunWith(AndroidJUnit4::class)
class AlarmReceiverTest {
    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val nm = context.getSystemService(NotificationManager::class.java)
    private lateinit var server: MockWebServer

    @Before
    fun setUp() {
        server = MockWebServer().apply { start() }
        AlarmGraph.cipherFactory = { PlainCipher() }
        AlarmGraph.schedulerFactory = { FakeScheduler() }
        AlarmGraph.clock = clockAt("2026-11-10T18:40:00Z")
        val store = AlarmGraph.store(context)
        store.baseUrl = server.url("/").toString()
        store.token = "device-token"
        store.alarms = listOf(item("s1:2026-11-10", "2026-11-10T18:40:00Z"))
    }

    @After
    fun tearDown() {
        server.shutdown()
        AlarmGraph.reset()
    }

    @Test
    fun `rings when the session is still open`() = runTest {
        server.enqueue(MockResponse().setBody("""{"status":"pending","answered":false,"snoozedUntil":null}"""))
        assertTrue(AlarmReceiver.handleFire(context, "s1:2026-11-10"))
        val req = server.takeRequest(1, TimeUnit.SECONDS)!!
        assertEquals("/api/sessions/status?key=s1%3A2026-11-10", req.path)
        assertEquals("Bearer device-token", req.getHeader("Authorization"))
        val n = shadowOf(nm).allNotifications.single()
        assertEquals(Notification.CATEGORY_ALARM, n.category)
        assertNotNull("full-screen intent", n.fullScreenIntent)
        assertEquals(AlarmNotifications.CHANNEL_ALARM, n.channelId)
        assertTrue(n.flags and Notification.FLAG_ONGOING_EVENT != 0)
        assertEquals(listOf("Ja", "Nein", "Später"), n.actions.map { it.title.toString() })
    }

    @Test
    fun `silently discards when already answered elsewhere`() = runTest {
        server.enqueue(MockResponse().setBody("""{"status":"held","answered":true,"snoozedUntil":null}"""))
        assertFalse(AlarmReceiver.handleFire(context, "s1:2026-11-10"))
        assertTrue(shadowOf(nm).allNotifications.isEmpty())
        assertTrue(AlarmGraph.store(context).alarms.isEmpty())
    }

    @Test
    fun `rings anyway when offline`() = runTest {
        server.shutdown()
        assertTrue(AlarmReceiver.handleFire(context, "s1:2026-11-10"))
        assertEquals(1, shadowOf(nm).allNotifications.size)
    }

    @Test
    fun `rings anyway on a slow server (3 s timeout)`() = runTest {
        server.enqueue(MockResponse().setBody("{}").setHeadersDelay(5, TimeUnit.SECONDS))
        assertTrue(AlarmReceiver.handleFire(context, "s1:2026-11-10"))
    }

    @Test
    fun `alarm channel has high importance`() {
        AlarmNotifications.ensureChannels(context)
        assertEquals(
            NotificationManager.IMPORTANCE_HIGH,
            nm.getNotificationChannel(AlarmNotifications.CHANNEL_ALARM).importance
        )
    }
}
