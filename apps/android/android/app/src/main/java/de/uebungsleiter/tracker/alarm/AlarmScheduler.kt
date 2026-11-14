// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import de.uebungsleiter.tracker.MainActivity

/** Abstraction over AlarmManager so the planning logic can be tested with a fake. */
interface AlarmScheduler {
    fun schedule(item: AlarmItem)

    fun cancel(key: String)
}

/** `setAlarmClock` = exact, Doze-proof, shows the alarm icon in the status bar (like a clock app). */
class AndroidAlarmScheduler(private val context: Context) : AlarmScheduler {
    private val alarmManager = context.getSystemService(AlarmManager::class.java)

    override fun schedule(item: AlarmItem) {
        val show =
            PendingIntent.getActivity(
                context,
                0,
                Intent(context, MainActivity::class.java),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
        alarmManager.setAlarmClock(
            AlarmManager.AlarmClockInfo(item.triggerAt, show),
            firePendingIntent(context, item.key)
        )
    }

    override fun cancel(key: String) {
        alarmManager.cancel(firePendingIntent(context, key))
    }

    companion object {
        /** stable request code per occurrence key */
        fun requestCode(key: String): Int = key.hashCode()

        fun firePendingIntent(context: Context, key: String): PendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode(key),
            Intent(context, AlarmReceiver::class.java)
                .setAction(AlarmReceiver.ACTION_FIRE)
                .putExtra(AlarmReceiver.EXTRA_KEY, key),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }
}
