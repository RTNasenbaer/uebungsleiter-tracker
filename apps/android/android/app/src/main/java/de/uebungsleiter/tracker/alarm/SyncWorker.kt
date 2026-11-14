// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Every 6 h (also when the app is never opened): fetch the alarms of the next 14 days,
 * reschedule, flush the answer queue and show the report reminder (§4.3 step 1, §4.7).
 */
class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val ctx = applicationContext
        AnswerQueue.flush(ctx)
        val api = AlarmGraph.api(ctx) ?: return@withContext Result.success()
        try {
            val res = api.alarms()
            val coordinator = AlarmGraph.coordinator(ctx)
            if (res.isAlarmDevice) coordinator.setAlarms(res.alarms, res.config) else coordinator.clearAll()
            if (res.isAlarmDevice) maybeShowReportReminder(ctx, res.config)
            Result.success()
        } catch (e: ApiException) {
            if (e.status == HTTP_UNAUTHORIZED) Result.failure() else Result.retry()
        } catch (_: java.io.IOException) {
            Result.retry()
        }
    }

    companion object {
        private const val PERIODIC = "alarm-sync-periodic"
        private const val ONCE = "alarm-sync-now"
        private const val INTERVAL_HOURS = 6L
        private const val REPORT_LEAD_DAYS = 14L
        private const val HTTP_UNAUTHORIZED = 401

        private val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

        fun schedulePeriodic(context: Context) {
            val req = PeriodicWorkRequestBuilder<SyncWorker>(
                INTERVAL_HOURS,
                TimeUnit.HOURS
            ).setConstraints(constraints).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, req)
        }

        fun runNow(context: Context) {
            val req = OneTimeWorkRequestBuilder<SyncWorker>().setConstraints(constraints).build()
            WorkManager.getInstance(context).enqueueUniqueWork(ONCE, ExistingWorkPolicy.REPLACE, req)
        }

        /** From 1.12. (or 14 days before the deadline) once per day until the deadline. */
        fun reportReminderDue(today: LocalDate, deadlineMmDd: String?): LocalDate? {
            val parts = deadlineMmDd?.split("-") ?: return null
            val deadline =
                runCatching { LocalDate.of(today.year, parts[0].toInt(), parts[1].toInt()) }.getOrNull() ?: return null
            val dec1 = LocalDate.of(today.year, java.time.Month.DECEMBER, 1)
            val from = minOf(deadline.minusDays(REPORT_LEAD_DAYS), dec1)
            return if (!today.isBefore(from) && !today.isAfter(deadline)) deadline else null
        }

        fun maybeShowReportReminder(context: Context, config: AlarmConfig) {
            val store = AlarmGraph.store(context)
            val today = LocalDate.now(AlarmGraph.clock)
            val deadline = reportReminderDue(today, config.reportDeadline) ?: return
            if (store.reportReminderShownOn == today.toString()) return
            store.reportReminderShownOn = today.toString()
            AlarmNotifications.showReportReminder(context, deadline.format(DateTimeFormatter.ofPattern("dd.MM.yyyy")))
        }
    }
}
