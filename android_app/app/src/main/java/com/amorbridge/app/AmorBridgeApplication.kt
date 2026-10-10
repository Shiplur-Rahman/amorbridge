package com.amorbridge.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build

class AmorBridgeApplication : Application() {

    companion object {
        const val CALL_CHANNEL_ID = "amorbridge_incoming_call_channel"
        const val CALL_CHANNEL_NAME = "Incoming Video Calls"
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build()

            val callChannel = NotificationChannel(
                CALL_CHANNEL_ID,
                CALL_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "High priority notifications for incoming video calls"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 800, 1000, 800)
                setSound(ringtoneUri, audioAttributes)
                lockscreenVisibility = NotificationChannel.USER_NOTIFICATION_ALL
            }

            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(callChannel)
        }
    }
}
