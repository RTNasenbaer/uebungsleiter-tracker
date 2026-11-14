// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Yes / No / Later buttons directly in the notification. */
class AnswerActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val key = intent.getStringExtra(AlarmReceiver.EXTRA_KEY) ?: return
        AlarmRinger.stop()
        when (intent.action) {
            ACTION_YES -> answer(context, key, AnswerStatus.HELD)
            ACTION_NO -> answer(context, key, AnswerStatus.NOT_HELD)
            ACTION_LATER -> {
                AlarmGraph.coordinator(context).snooze(key, "", "")
                AlarmNotifications.cancel(context, key)
            }
        }
    }

    private fun answer(context: Context, key: String, status: String) {
        if (key == AlarmCoordinator.TEST_KEY) {
            AlarmGraph.coordinator(context).remove(key)
            AlarmNotifications.cancel(context, key)
        } else {
            AnswerQueue.enqueue(context, key, status, null)
        }
    }

    companion object {
        const val ACTION_YES = "de.uebungsleiter.tracker.alarm.YES"
        const val ACTION_NO = "de.uebungsleiter.tracker.alarm.NO"
        const val ACTION_LATER = "de.uebungsleiter.tracker.alarm.LATER"
    }
}
