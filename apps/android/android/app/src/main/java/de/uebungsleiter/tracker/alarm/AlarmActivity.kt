// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.View
import android.view.WindowManager
import android.view.animation.PathInterpolator
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import de.uebungsleiter.tracker.R

/** Full-screen "Training gehalten?" screen shown over the lock screen (§4.3 step 4). */
class AlarmActivity : AppCompatActivity() {
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var item: AlarmItem
    private var answered = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        showOverLockScreen()
        setContentView(R.layout.activity_alarm)
        item = readItem(intent)
        val store = AlarmGraph.store(this)
        val config = store.config

        val display = AlarmDisplay.from(item, AlarmGraph.clock)
        findViewById<TextView>(R.id.alarm_label).text = display.label
        findViewById<TextView>(R.id.alarm_date).text = display.date
        findViewById<TextView>(R.id.alarm_time).text = display.time
        findViewById<TextView>(R.id.alarm_location).apply {
            text = display.location
            visibility = if (display.location.isBlank()) View.GONE else View.VISIBLE
        }
        val later = findViewById<Button>(R.id.alarm_later)
        later.text = getString(R.string.alarm_later, config.snoozeMinutes)
        val note = findViewById<EditText>(R.id.alarm_note)
        note.setOnFocusChangeListener { _, hasFocus -> if (hasFocus) requestUnlockForTyping() }

        findViewById<Button>(R.id.alarm_yes).setOnClickListener { answer(AnswerStatus.HELD, note.text.toString()) }
        findViewById<Button>(R.id.alarm_no).setOnClickListener { answer(AnswerStatus.NOT_HELD, note.text.toString()) }
        later.setOnClickListener { snooze() }

        if (!intent.getBooleanExtra(EXTRA_SILENT, false)) AlarmRinger.start(this, config)
        handler.postDelayed({ ringTimeout() }, config.ringSeconds * MILLIS)
    }

    private fun showOverLockScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    /** Typing a note needs the keyboard → ask to unlock only then. */
    private fun requestUnlockForTyping() {
        getSystemService(KeyguardManager::class.java)?.requestDismissKeyguard(this, null)
    }

    private fun answer(status: String, note: String) {
        answered = true
        AlarmRinger.stop()
        if (item.key == AlarmCoordinator.TEST_KEY) {
            AlarmGraph.coordinator(this).remove(item.key)
            AlarmNotifications.cancel(this, item.key)
        } else {
            AnswerQueue.enqueue(this, item.key, status, note)
        }
        showConfirmation()
    }

    /** "Eingetragen" with the ball bounce (scale .9 → 1.06 → 1, 320 ms); closes after 1.2 s (DESIGN.md §7/§9). */
    private fun showConfirmation() {
        findViewById<View>(R.id.alarm_content).visibility = View.GONE
        val confirm = findViewById<View>(R.id.alarm_confirm)
        val icon = findViewById<View>(R.id.alarm_confirm_icon)
        confirm.visibility = View.VISIBLE
        if (reducedMotion()) {
            confirm.alpha = 0f
            confirm.animate().alpha(1f).setDuration(FADE_MS).start()
        } else {
            icon.scaleX = BOUNCE_START
            icon.scaleY = BOUNCE_START
            icon.animate().scaleX(BOUNCE_PEAK).scaleY(BOUNCE_PEAK).setDuration(BOUNCE_UP_MS)
                .setInterpolator(STANDARD_EASING)
                .withEndAction {
                    icon.animate().scaleX(1f).scaleY(1f)
                        .setDuration(BOUNCE_DOWN_MS)
                        .setInterpolator(STANDARD_EASING)
                        .start()
                }.start()
        }
        handler.postDelayed({ finish() }, CONFIRM_MS)
    }

    /** Reduced motion: "Remove animations" sets the animator duration scale to 0. */
    private fun reducedMotion(): Boolean =
        Settings.Global.getFloat(contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f

    private fun snooze() {
        answered = true
        AlarmRinger.stop()
        AlarmGraph.coordinator(this).snooze(item.key, item.title, item.subtitle)
        AlarmNotifications.cancel(this, item.key)
        finish()
    }

    /** Ringing ends → persistent notification + reminder in 12 h (max. 2×). */
    private fun ringTimeout() {
        if (answered || isFinishing) return
        AlarmRinger.stop()
        val coordinator = AlarmGraph.coordinator(this)
        val current = coordinator.find(item.key) ?: item
        if (item.key != AlarmCoordinator.TEST_KEY) {
            coordinator.scheduleReminder(current)
            AlarmNotifications.show(
                this,
                AlarmNotifications.notificationId(item.key),
                AlarmNotifications.buildOpenReminder(this, item)
            )
        } else {
            coordinator.remove(item.key)
            AlarmNotifications.cancel(this, item.key)
        }
        finish()
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        if (answered) AlarmRinger.stop()
        super.onDestroy()
    }

    companion object {
        const val EXTRA_KEY = "key"
        const val EXTRA_TITLE = "title"
        const val EXTRA_SUBTITLE = "subtitle"
        const val EXTRA_TRIGGER = "triggerAt"
        const val EXTRA_REMINDERS = "reminders"
        const val EXTRA_SILENT = "silent"
        private const val MILLIS = 1000L
        private const val CONFIRM_MS = 1200L
        private const val FADE_MS = 120L
        private const val BOUNCE_UP_MS = 190L
        private const val BOUNCE_DOWN_MS = 130L
        private const val BOUNCE_START = 0.9f
        private const val BOUNCE_PEAK = 1.06f
        private val STANDARD_EASING = PathInterpolator(0.2f, 0.8f, 0.2f, 1f)

        fun intent(context: Context, item: AlarmItem): Intent = Intent(context, AlarmActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION)
            .putExtra(EXTRA_KEY, item.key)
            .putExtra(EXTRA_TITLE, item.title)
            .putExtra(EXTRA_SUBTITLE, item.subtitle)
            .putExtra(EXTRA_TRIGGER, item.triggerAt)
            .putExtra(EXTRA_REMINDERS, item.reminderCount)

        fun readItem(intent: Intent) = AlarmItem(
            key = intent.getStringExtra(EXTRA_KEY) ?: AlarmCoordinator.TEST_KEY,
            triggerAt = intent.getLongExtra(EXTRA_TRIGGER, 0),
            title = intent.getStringExtra(EXTRA_TITLE).orEmpty(),
            subtitle = intent.getStringExtra(EXTRA_SUBTITLE).orEmpty(),
            reminderCount = intent.getIntExtra(EXTRA_REMINDERS, 0)
        )
    }
}
