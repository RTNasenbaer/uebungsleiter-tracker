// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.content.Context
import java.time.Clock

/** Tiny service locator; tests replace clock, scheduler or cipher. */
object AlarmGraph {
    @Volatile var clock: Clock = Clock.system(BERLIN)

    @Volatile var schedulerFactory: (Context) -> AlarmScheduler = { AndroidAlarmScheduler(it) }

    @Volatile var cipherFactory: () -> TokenCipher = { KeystoreTokenCipher() }

    @Volatile var apiFactory: (AlarmStore) -> ApiClient? = { ApiClient.from(it) }

    fun store(context: Context) = AlarmStore(context, cipherFactory())

    fun coordinator(context: Context) =
        AlarmCoordinator(store(context), schedulerFactory(context.applicationContext), clock)

    fun api(context: Context): ApiClient? = apiFactory(store(context))

    fun reset() {
        clock = Clock.system(BERLIN)
        schedulerFactory = { AndroidAlarmScheduler(it) }
        cipherFactory = { KeystoreTokenCipher() }
        apiFactory = { ApiClient.from(it) }
    }
}
