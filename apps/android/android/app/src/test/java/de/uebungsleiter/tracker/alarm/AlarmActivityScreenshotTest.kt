// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.content.Context
import android.widget.Button
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.matcher.ViewMatchers.isRoot
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import com.github.takahirom.roborazzi.captureRoboImage
import de.uebungsleiter.tracker.R
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Roborazzi screenshots of the full-screen alarm (light / dark / font scale 1.3, Pixel size). */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w411dp-h914dp-xxhdpi")
class AlarmActivityScreenshotTest {
    private val context = ApplicationProvider.getApplicationContext<Context>()

    @Before
    fun setUp() {
        WorkManagerTestInitHelper.initializeTestWorkManager(context)
        AlarmGraph.cipherFactory = { PlainCipher() }
        AlarmGraph.schedulerFactory = { FakeScheduler() }
        AlarmGraph.clock = clockAt("2026-11-10T18:40:00Z")
        AlarmGraph.store(context).config = AlarmConfig(snoozeMinutes = 30)
    }

    @After
    fun tearDown() = AlarmGraph.reset()

    private fun launch() = ActivityScenario.launch<AlarmActivity>(
        AlarmActivity
            .intent(context, item("s1:2026-11-10", "2026-11-10T18:40:00Z"))
            .putExtra(AlarmActivity.EXTRA_SILENT, true)
    )

    @Test
    fun light() {
        launch().use { onView(isRoot()).captureRoboImage("../../screenshots/alarm_light.png") }
    }

    @Test
    @Config(qualifiers = "+night")
    fun dark() {
        launch().use { onView(isRoot()).captureRoboImage("../../screenshots/alarm_dark.png") }
    }

    @Test
    @Config(fontScale = 1.3f)
    fun largeFont() {
        launch().use { onView(isRoot()).captureRoboImage("../../screenshots/alarm_font130.png") }
    }

    @Test
    fun `shows time, question and big buttons`() {
        launch().use { s ->
            s.onActivity { a ->
                assertEquals("19:40", a.findViewById<android.widget.TextView>(R.id.alarm_time).text.toString())
                assertEquals(
                    "U12 Training gehalten?",
                    a.findViewById<android.widget.TextView>(R.id.alarm_title).text.toString()
                )
                assertEquals("Später (30 min)", a.findViewById<Button>(R.id.alarm_later).text.toString())
                val density = a.resources.displayMetrics.density
                assertTrue(a.findViewById<Button>(R.id.alarm_yes).minimumHeight / density >= 48)
            }
        }
    }

    @Test
    fun `yes queues the answer and closes`() {
        launch().use { s ->
            s.onActivity { a -> a.findViewById<Button>(R.id.alarm_yes).performClick() }
            assertEquals(listOf("held"), AlarmGraph.store(context).pendingAnswers.map { it.status })
        }
    }
}
