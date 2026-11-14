// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import de.uebungsleiter.tracker.MainActivity
import de.uebungsleiter.tracker.R

object AlarmNotifications {
    const val CHANNEL_ALARM = "training_alarm"
    const val CHANNEL_REMINDER = "training_reminder"
    private const val REPORT_NOTIFICATION_ID = 4711

    fun ensureChannels(context: Context) {
        val nm = context.getSystemService(NotificationManager::class.java)
        val alarm =
            NotificationChannel(
                CHANNEL_ALARM,
                context.getString(R.string.alarm_channel_name),
                NotificationManager.IMPORTANCE_HIGH
            )
                .apply {
                    description = context.getString(R.string.alarm_channel_description)
                    // the activity plays the sound itself (USAGE_ALARM); the channel sound is the fallback
                    // for devices where the full-screen intent is not allowed (heads-up notification)
                    setSound(
                        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
                        AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
                    )
                    enableVibration(true)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    setBypassDnd(true)
                }
        val reminder =
            NotificationChannel(
                CHANNEL_REMINDER,
                context.getString(R.string.reminder_channel_name),
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply { description = context.getString(R.string.reminder_channel_description) }
        nm.createNotificationChannels(listOf(alarm, reminder))
    }

    fun notificationId(key: String): Int = key.hashCode()

    private fun answerIntent(context: Context, key: String, action: String): PendingIntent = PendingIntent.getBroadcast(
        context,
        (key + action).hashCode(),
        Intent(context, AnswerActionReceiver::class.java).setAction(action).putExtra(AlarmReceiver.EXTRA_KEY, key),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

    fun activityIntent(context: Context, item: AlarmItem): PendingIntent = PendingIntent.getActivity(
        context,
        notificationId(item.key),
        AlarmActivity.intent(context, item),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

    /** Full-screen alarm (§4.3 step 4). Without full-screen permission it is shown as heads-up with sound. */
    fun buildAlarm(context: Context, item: AlarmItem): Notification {
        ensureChannels(context)
        val fullScreen = activityIntent(context, item)
        return NotificationCompat
            .Builder(context, CHANNEL_ALARM)
            .setSmallIcon(R.drawable.ic_stat_alarm)
            .setContentTitle(item.title)
            .setContentText(item.subtitle)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setFullScreenIntent(fullScreen, true)
            .setContentIntent(fullScreen)
            .addAction(
                0,
                context.getString(R.string.action_yes),
                answerIntent(context, item.key, AnswerActionReceiver.ACTION_YES)
            )
            .addAction(
                0,
                context.getString(R.string.action_no),
                answerIntent(context, item.key, AnswerActionReceiver.ACTION_NO)
            )
            .addAction(
                0,
                context.getString(R.string.action_later),
                answerIntent(context, item.key, AnswerActionReceiver.ACTION_LATER)
            )
            .build()
    }

    /** After ringing ends: persistent notification with Yes/No (§4.3 step 5). */
    fun buildOpenReminder(context: Context, item: AlarmItem): Notification {
        ensureChannels(context)
        return NotificationCompat
            .Builder(context, CHANNEL_REMINDER)
            .setSmallIcon(R.drawable.ic_stat_alarm)
            .setContentTitle(context.getString(R.string.open_answer_title, item.title))
            .setContentText(item.subtitle)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setOngoing(true)
            .setContentIntent(activityIntent(context, item))
            .addAction(
                0,
                context.getString(R.string.action_yes),
                answerIntent(context, item.key, AnswerActionReceiver.ACTION_YES)
            )
            .addAction(
                0,
                context.getString(R.string.action_no),
                answerIntent(context, item.key, AnswerActionReceiver.ACTION_NO)
            )
            .build()
    }

    @Suppress("MissingPermission") // checked via areNotificationsEnabled
    fun show(context: Context, id: Int, notification: Notification) {
        val nm = NotificationManagerCompat.from(context)
        if (nm.areNotificationsEnabled()) nm.notify(id, notification)
    }

    fun cancel(context: Context, key: String) {
        NotificationManagerCompat.from(context).cancel(notificationId(key))
    }

    /** §4.7: simple notification (no full screen) before the report deadline. */
    fun showReportReminder(context: Context, deadline: String) {
        ensureChannels(context)
        val open =
            PendingIntent.getActivity(
                context,
                REPORT_NOTIFICATION_ID,
                Intent(context, MainActivity::class.java),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
        val n =
            NotificationCompat
                .Builder(context, CHANNEL_REMINDER)
                .setSmallIcon(R.drawable.ic_stat_alarm)
                .setContentTitle(context.getString(R.string.report_reminder_title))
                .setContentText(context.getString(R.string.report_reminder_text, deadline))
                .setContentIntent(open)
                .setAutoCancel(true)
                .build()
        show(context, REPORT_NOTIFICATION_ID, n)
    }
}
