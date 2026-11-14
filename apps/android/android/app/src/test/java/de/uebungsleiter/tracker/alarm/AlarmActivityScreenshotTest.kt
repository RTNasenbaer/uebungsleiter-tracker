// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.content.Context
import android.widget.Button
import android.widget.TextView
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.matcher.ViewMatchers.isRoot
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import com.github.takahirom.roborazzi.captureRoboImage
import de.uebungsleiter.tracker.R
import java.time.Instant
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Roborazzi screenshots of the full-screen alarm (system light/dark × font scale 1.0/1.3, Pixel size). */
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

    private val alarm = AlarmItem(
        "s1:2026-11-10",
        Instant.parse("2026-11-10T18:40:00Z").toEpochMilli(),
        "U12 Training gehalten?",
        "Di, 10.11. · 18:00–19:30 · Sporthalle Gymnasium"
    )

    private fun launch() = ActivityScenario.launch<AlarmActivity>(
        AlarmActivity.intent(context, alarm).putExtra(AlarmActivity.EXTRA_SILENT, true)
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
    @Config(qualifiers = "+night", fontScale = 1.3f)
    fun largeFontDark() {
        launch().use { onView(isRoot()).captureRoboImage("../../screenshots/alarm_dark_font130.png") }
    }

    @Test
    fun confirmation() {
        launch().use { s ->
            s.onActivity { a -> a.findViewById<Button>(R.id.alarm_yes).performClick() }
            onView(isRoot()).captureRoboImage("../../screenshots/alarm_confirm.png")
        }
    }

    @Test
    fun `shows the scoreboard hierarchy and big buttons`() {
        launch().use { s ->
            s.onActivity { a ->
                fun text(id: Int) = a.findViewById<TextView>(id).text.toString()
                assertEquals("U12 TRAINING", text(R.id.alarm_label))
                assertEquals("Di, 10.11.", text(R.id.alarm_date))
                assertEquals("18:00–19:30", text(R.id.alarm_time))
                assertEquals("Sporthalle Gymnasium", text(R.id.alarm_location))
                assertEquals("Training gehalten?", text(R.id.alarm_title))
                assertEquals("Später (30 min)", a.findViewById<Button>(R.id.alarm_later).text.toString())
                val density = a.resources.displayMetrics.density
                // DESIGN.md §7: JA 72 dp, NEIN 64 dp, Später 48 dp
                assertTrue(a.findViewById<Button>(R.id.alarm_yes).minimumHeight / density >= 72)
                assertTrue(a.findViewById<Button>(R.id.alarm_no).minimumHeight / density >= 64)
                assertTrue(a.findViewById<Button>(R.id.alarm_later).minimumHeight / density >= 48)
            }
        }
    }

    @Test
    fun `yes shows the confirmation`() {
        launch().use { s ->
            s.onActivity { a ->
                a.findViewById<Button>(R.id.alarm_yes).performClick()
                val confirm = a.findViewById<android.view.View>(R.id.alarm_confirm)
                assertEquals(android.view.View.VISIBLE, confirm.visibility)
                assertEquals("Eingetragen", a.findViewById<TextView>(R.id.alarm_confirm_text).text.toString())
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
