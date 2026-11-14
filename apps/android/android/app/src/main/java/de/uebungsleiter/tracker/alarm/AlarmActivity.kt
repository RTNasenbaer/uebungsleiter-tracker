// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import de.uebungsleiter.tracker.R
import java.time.Instant
import java.time.format.DateTimeFormatter

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

        findViewById<TextView>(R.id.alarm_time).text =
            Instant.now(AlarmGraph.clock).atZone(BERLIN).format(DateTimeFormatter.ofPattern("HH:mm"))
        findViewById<TextView>(R.id.alarm_title).text = item.title.ifBlank { getString(R.string.alarm_question) }
        findViewById<TextView>(R.id.alarm_subtitle).text = item.subtitle
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
        Toast.makeText(this, R.string.alarm_saved, Toast.LENGTH_SHORT).show()
        finish()
    }

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
