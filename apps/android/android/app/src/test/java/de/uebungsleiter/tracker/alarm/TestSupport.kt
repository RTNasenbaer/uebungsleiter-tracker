// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

/** Robolectric has no AndroidKeyStore provider → identity cipher in tests only. */
class PlainCipher : TokenCipher {
    override fun encrypt(plain: String) = "plain:$plain"

    override fun decrypt(encoded: String) = encoded.removePrefix("plain:")
}

class FakeScheduler : AlarmScheduler {
    val scheduled = linkedMapOf<String, AlarmItem>()
    val cancelled = mutableListOf<String>()

    override fun schedule(item: AlarmItem) {
        scheduled[item.key] = item
    }

    override fun cancel(key: String) {
        scheduled.remove(key)
        cancelled += key
    }
}

fun clockAt(iso: String): Clock = Clock.fixed(Instant.parse(iso), ZoneOffset.UTC)

fun item(key: String, iso: String) =
    AlarmItem(key, Instant.parse(iso).toEpochMilli(), "U12 Training gehalten?", "Di, 10.11.2026 · bis 19:30")
