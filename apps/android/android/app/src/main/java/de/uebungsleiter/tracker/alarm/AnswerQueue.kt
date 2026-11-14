// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import java.time.Instant
import java.util.concurrent.TimeUnit

/** Answers are stored locally first and uploaded by WorkManager when online (§4.3 step 6). */
object AnswerQueue {
    private const val WORK_NAME = "answer-upload"
    private const val BACKOFF_SECONDS = 30L

    @Synchronized
    fun enqueue(context: Context, key: String, status: String, note: String?) {
        val store = AlarmGraph.store(context)
        val answer =
            PendingAnswer(key, status, Instant.now(AlarmGraph.clock).toString(), note?.takeIf { it.isNotBlank() })
        store.pendingAnswers = store.pendingAnswers.filter { it.key != key } + answer
        AlarmGraph.coordinator(context).remove(key)
        AlarmNotifications.cancel(context, key)
        scheduleUpload(context)
    }

    fun scheduleUpload(context: Context) {
        val request =
            OneTimeWorkRequestBuilder<AnswerUploadWorker>()
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, BACKOFF_SECONDS, TimeUnit.SECONDS)
                .build()
        WorkManager.getInstance(context).enqueueUniqueWork(WORK_NAME, ExistingWorkPolicy.APPEND_OR_REPLACE, request)
    }

    /** Uploads all queued answers; returns true when the queue is empty afterwards. */
    @Synchronized
    fun flush(context: Context): Boolean {
        val store = AlarmGraph.store(context)
        val api = AlarmGraph.api(context) ?: return store.pendingAnswers.isEmpty()
        val remaining =
            store.pendingAnswers.filterNot { answer ->
                try {
                    api.answer(answer)
                    true
                } catch (e: ApiException) {
                    // 4xx (except 429) will never succeed → drop; 5xx/429 → retry later
                    e.status in CLIENT_ERRORS && e.status != TOO_MANY_REQUESTS
                } catch (_: java.io.IOException) {
                    false
                }
            }
        store.pendingAnswers = remaining
        return remaining.isEmpty()
    }

    private val CLIENT_ERRORS = 400..499
    private const val TOO_MANY_REQUESTS = 429
}
