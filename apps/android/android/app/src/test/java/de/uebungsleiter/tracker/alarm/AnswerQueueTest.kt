// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.ListenableWorker
import androidx.work.testing.TestListenableWorkerBuilder
import androidx.work.testing.WorkManagerTestInitHelper
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AnswerQueueTest {
    private val context = ApplicationProvider.getApplicationContext<Context>()
    private lateinit var server: MockWebServer

    @Before
    fun setUp() {
        WorkManagerTestInitHelper.initializeTestWorkManager(context)
        server = MockWebServer().apply { start() }
        AlarmGraph.cipherFactory = { PlainCipher() }
        AlarmGraph.schedulerFactory = { FakeScheduler() }
        AlarmGraph.clock = clockAt("2026-11-10T18:45:00Z")
        val store = AlarmGraph.store(context)
        store.baseUrl = server.url("/").toString()
        store.token = "device-token"
        store.pendingAnswers = emptyList()
        store.alarms = listOf(item("s1:2026-11-10", "2026-11-10T18:40:00Z"))
    }

    @After
    fun tearDown() {
        server.shutdown()
        AlarmGraph.reset()
    }

    @Test
    fun `answer is queued locally and uploaded by the worker`() = runTest {
        AnswerQueue.enqueue(context, "s1:2026-11-10", AnswerStatus.HELD, "Vertretung")
        val store = AlarmGraph.store(context)
        assertEquals(1, store.pendingAnswers.size)
        assertTrue("alarm removed after answering", store.alarms.isEmpty())

        server.enqueue(MockResponse().setBody("{}"))
        val result = TestListenableWorkerBuilder<AnswerUploadWorker>(context).build().doWork()
        assertEquals(ListenableWorker.Result.success(), result)
        val req = server.takeRequest(1, TimeUnit.SECONDS)!!
        assertEquals("POST", req.method)
        assertEquals("/api/sessions/answer", req.path)
        val body = JSONObject(req.body.readUtf8())
        assertEquals("s1:2026-11-10", body.getString("occurrence_key"))
        assertEquals("held", body.getString("status"))
        assertEquals("2026-11-10T18:45:00Z", body.getString("answered_at"))
        assertEquals("Vertretung", body.getString("note"))
        assertEquals("alarm", body.getString("via"))
        assertTrue(store.pendingAnswers.isEmpty())
    }

    @Test
    fun `worker retries on server errors and keeps the answer`() = runTest {
        AnswerQueue.enqueue(context, "s1:2026-11-10", AnswerStatus.NOT_HELD, null)
        server.enqueue(MockResponse().setResponseCode(503))
        val result = TestListenableWorkerBuilder<AnswerUploadWorker>(context).build().doWork()
        assertEquals(ListenableWorker.Result.retry(), result)
        assertEquals(1, AlarmGraph.store(context).pendingAnswers.size)
    }

    @Test
    fun `answering twice keeps only the latest answer for a key`() {
        AnswerQueue.enqueue(context, "k", AnswerStatus.HELD, null)
        AnswerQueue.enqueue(context, "k", AnswerStatus.NOT_HELD, null)
        assertEquals(listOf("not_held"), AlarmGraph.store(context).pendingAnswers.map { it.status })
    }
}
