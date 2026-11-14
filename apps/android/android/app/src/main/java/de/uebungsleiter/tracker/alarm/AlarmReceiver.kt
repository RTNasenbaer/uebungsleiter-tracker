// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull

/** Fired by AlarmManager (§4.3 step 3–4). */
class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_FIRE) return
        val key = intent.getStringExtra(EXTRA_KEY) ?: return
        val pending = goAsync()
        scope.launch {
            try {
                handleFire(context.applicationContext, key)
            } finally {
                pending.finish()
            }
        }
    }

    companion object {
        const val ACTION_FIRE = "de.uebungsleiter.tracker.alarm.FIRE"
        const val EXTRA_KEY = "key"
        private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

        /**
         * Online check (max. 3 s): already answered / cancelled → discard silently.
         * Offline or server error → ring anyway.
         */
        suspend fun handleFire(context: Context, key: String): Boolean {
            val coordinator = AlarmGraph.coordinator(context)
            val item = coordinator.find(key) ?: AlarmItem(key, 0, "", "")
            if (key != AlarmCoordinator.TEST_KEY) {
                val status =
                    withTimeoutOrNull(ApiClient.ONLINE_CHECK_TIMEOUT_MS.toLong()) {
                        runCatching {
                            AlarmGraph.api(context)?.status(key, ApiClient.ONLINE_CHECK_TIMEOUT_MS)
                        }.getOrNull()
                    }
                val snoozedLater =
                    status?.snoozedUntil?.let {
                        runCatching {
                            java.time.Instant.parse(it).toEpochMilli() >
                                AlarmGraph.clock.millis() + SNOOZE_SLACK_MS
                        }
                            .getOrDefault(false)
                    } ?: false
                if (status?.answered == true || snoozedLater) {
                    coordinator.remove(key)
                    AlarmNotifications.cancel(context, key)
                    return false
                }
            }
            AlarmNotifications.show(
                context,
                AlarmNotifications.notificationId(key),
                AlarmNotifications.buildAlarm(context, item)
            )
            return true
        }

        private const val SNOOZE_SLACK_MS = 60_000L
    }
}
