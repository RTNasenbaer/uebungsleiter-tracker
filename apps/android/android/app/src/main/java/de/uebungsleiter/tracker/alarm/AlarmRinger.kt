// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker.alarm

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

/** Plays the alarm sound on the alarm stream (respects alarm volume, not media volume) and vibrates. */
object AlarmRinger {
    private var player: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private val PATTERN = longArrayOf(0, 800, 600)

    @Synchronized
    fun start(context: Context, config: AlarmConfig) {
        stop()
        val uri =
            config.sound?.let { runCatching { Uri.parse(it) }.getOrNull() }
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
        player =
            runCatching {
                MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes
                            .Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    setDataSource(context, uri)
                    isLooping = true
                    prepare()
                    start()
                }
            }.getOrNull()
        if (config.vibrate) {
            vibrator =
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                    context.getSystemService(VibratorManager::class.java)?.defaultVibrator
                } else {
                    @Suppress("DEPRECATION")
                    context.getSystemService(Vibrator::class.java)
                }
            vibrator?.vibrate(VibrationEffect.createWaveform(PATTERN, 0))
        }
    }

    @Synchronized
    fun stop() {
        player?.runCatching {
            stop()
            release()
        }
        player = null
        vibrator?.cancel()
        vibrator = null
    }
}
