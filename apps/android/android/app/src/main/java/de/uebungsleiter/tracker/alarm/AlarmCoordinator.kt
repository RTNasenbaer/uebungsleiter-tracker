// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import java.time.Clock

/**
 * Keeps the set of scheduled alarms in sync with the list from the server (§4.3 steps 1–2)
 * and handles local follow-ups (snooze, reminders, test alarm).
 */
class AlarmCoordinator(private val store: AlarmStore, private val scheduler: AlarmScheduler, private val clock: Clock) {
    /** Replaces all alarms: cancels the ones that disappeared, (re)schedules all future ones. */
    fun setAlarms(items: List<AlarmItem>, config: AlarmConfig? = null): Int {
        config?.let { store.config = it }
        val now = clock.millis()
        val previous = store.alarms
        // Local follow-ups (snooze, 12 h reminders, test alarm) are kept: the server only lists future
        // alarms, and the online check when firing discards follow-ups that were answered meanwhile.
        val localFollowUps = previous.filter { it.reminderCount > 0 || it.key == TEST_KEY }.associateBy { it.key }
        val serverKeys = items.map { it.key }.toSet()
        val merged =
            items.map { item -> localFollowUps[item.key]?.takeIf { it.triggerAt > item.triggerAt } ?: item } +
                localFollowUps.values.filter { it.key !in serverKeys }
        val future = merged.filter { it.triggerAt > now }.distinctBy { it.key }
        val keep = future.map { it.key }.toSet()
        previous.filter { it.key !in keep }.forEach { scheduler.cancel(it.key) }
        future.forEach { scheduler.schedule(it) }
        store.alarms = future
        return future.size
    }

    fun clearAll() {
        store.alarms.forEach { scheduler.cancel(it.key) }
        store.alarms = emptyList()
    }

    /** After reboot / time change: schedule everything that is still in the future again. */
    fun rescheduleAll(): Int {
        val now = clock.millis()
        val future = store.alarms.filter { it.triggerAt > now }
        future.forEach { scheduler.schedule(it) }
        store.alarms = future
        return future.size
    }

    fun find(key: String): AlarmItem? = store.alarms.firstOrNull { it.key == key }

    /** The alarm rang / was answered → no longer pending locally. */
    fun remove(key: String) {
        scheduler.cancel(key)
        store.alarms = store.alarms.filter { it.key != key }
    }

    fun snooze(key: String, fallbackTitle: String, fallbackSubtitle: String): AlarmItem {
        val base = find(key) ?: AlarmItem(key, 0, fallbackTitle, fallbackSubtitle)
        val item = base.copy(triggerAt = AlarmTiming.snoozeAt(clock, store.config.snoozeMinutes), reminderCount = 1)
        upsert(item)
        return item
    }

    /** Schedules the "still open" reminder (12 h later, max. 2×, not in quiet hours); null when exhausted. */
    fun scheduleReminder(item: AlarmItem): AlarmItem? {
        if (item.reminderCount >= AlarmTiming.MAX_REMINDERS) {
            remove(item.key)
            return null
        }
        val next =
            item.copy(
                triggerAt = AlarmTiming.reminderAt(clock, store.config.quietHours),
                reminderCount = item.reminderCount + 1
            )
        upsert(next)
        return next
    }

    fun testAlarm(delaySeconds: Int, title: String, subtitle: String): AlarmItem {
        val item = AlarmItem(TEST_KEY, clock.millis() + delaySeconds * MILLIS, title, subtitle)
        upsert(item)
        return item
    }

    private fun upsert(item: AlarmItem) {
        scheduler.schedule(item)
        store.alarms = store.alarms.filter { it.key != item.key } + item
    }

    companion object {
        const val TEST_KEY = "test:alarm"
        private const val MILLIS = 1000L
    }
}
