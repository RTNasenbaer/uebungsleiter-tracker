// SPDX-License-Identifier: AGPL-3.0-or-later
package de.uebungsleiter.tracker

import android.os.Bundle
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.getcapacitor.BridgeActivity
import de.uebungsleiter.tracker.alarm.TrainingAlarmPlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        registerPlugin(TrainingAlarmPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
