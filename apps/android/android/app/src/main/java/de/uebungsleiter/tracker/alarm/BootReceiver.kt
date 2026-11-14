// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Alarms are lost on reboot / time change → schedule again from local storage, then sync. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action !in ACTIONS) return
        AlarmGraph.coordinator(context).rescheduleAll()
        if (AlarmGraph.store(context).isPaired()) {
            SyncWorker.schedulePeriodic(context)
            SyncWorker.runNow(context)
            AnswerQueue.scheduleUpload(context)
        }
    }

    companion object {
        val ACTIONS =
            setOf(
                Intent.ACTION_BOOT_COMPLETED,
                Intent.ACTION_TIME_CHANGED,
                Intent.ACTION_TIMEZONE_CHANGED,
                Intent.ACTION_MY_PACKAGE_REPLACED,
                "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED"
            )
    }
}
