// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import java.util.concurrent.TimeUnit
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Runs in the GitHub Actions emulator (API 34 + 35): lock the device, let an alarm fire,
 * check that AlarmActivity is visible over the lock screen, tap "JA" and verify the upload.
 */
@RunWith(AndroidJUnit4::class)
class AlarmOverLockScreenTest {
    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
    private lateinit var server: MockWebServer
    private val pkg = "de.uebungsleiter.tracker"

    @Before
    fun setUp() {
        device.executeShellCommand("pm grant $pkg android.permission.POST_NOTIFICATIONS")
        device.executeShellCommand("appops set $pkg USE_FULL_SCREEN_INTENT allow")
        device.executeShellCommand("locksettings set-disabled false")
        server = MockWebServer().apply { start() }
        val store = AlarmGraph.store(context)
        store.baseUrl = server.url("/").toString()
        store.token = "instrumented-token"
        store.pendingAnswers = emptyList()
        store.alarms = emptyList()
        AlarmNotifications.ensureChannels(context)
    }

    @After
    fun tearDown() {
        server.shutdown()
        device.wakeUp()
    }

    @Test
    fun alarmShowsOverLockScreenAndUploadsTheAnswer() {
        val key = "s-instrumented:2026-11-10"
        // status check → still open; then the answer upload
        server.enqueue(MockResponse().setBody("""{"status":"pending","answered":false,"snoozedUntil":null}"""))
        server.enqueue(MockResponse().setBody("{}"))

        val coordinator = AlarmGraph.coordinator(context)
        coordinator.setAlarms(
            listOf(AlarmItem(key, System.currentTimeMillis() + DELAY_MS, "U12 Training gehalten?", "Instrumented"))
        )
        device.sleep() // screen off → keyguard
        Thread.sleep(LOCK_SETTLE_MS)

        val yes = device.wait(Until.findObject(By.text("JA, gehalten")), WAIT_MS)
        assertNotNull("AlarmActivity not visible over the lock screen", yes)
        assertTrue(device.findObject(By.text("U12 Training gehalten?")) != null)
        yes.click()

        val status = server.takeRequest(UPLOAD_WAIT_S, TimeUnit.SECONDS)
        assertNotNull(status)
        assertTrue(status!!.path!!.startsWith("/api/sessions/status"))
        val upload = server.takeRequest(UPLOAD_WAIT_S, TimeUnit.SECONDS)
        assertNotNull("answer was not uploaded", upload)
        assertEquals("/api/sessions/answer", upload!!.path)
        assertEquals("Bearer instrumented-token", upload.getHeader("Authorization"))
        val body = JSONObject(upload.body.readUtf8())
        assertEquals(key, body.getString("occurrence_key"))
        assertEquals("held", body.getString("status"))
    }

    companion object {
        private const val DELAY_MS = 5_000L
        private const val LOCK_SETTLE_MS = 1_000L
        private const val WAIT_MS = 30_000L
        private const val UPLOAD_WAIT_S = 30L
    }
}
