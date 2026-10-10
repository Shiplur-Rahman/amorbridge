package com.amorbridge.app.service

import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import com.amorbridge.app.AmorBridgeApplication
import com.amorbridge.app.R
import com.amorbridge.app.ui.CallActivity

class CallService : Service() {

    companion object {
        const val ACTION_INCOMING_CALL = "com.amorbridge.app.ACTION_INCOMING_CALL"
        const val ACTION_ACCEPT_CALL = "com.amorbridge.app.ACTION_ACCEPT_CALL"
        const val ACTION_DECLINE_CALL = "com.amorbridge.app.ACTION_DECLINE_CALL"
        const val EXTRA_CALLER_NAME = "extra_caller_name"
        const val EXTRA_ROOM_ID = "extra_room_id"
        const val NOTIFICATION_ID = 2001

        fun startIncomingCall(context: Context, callerName: String, roomId: String) {
            val intent = Intent(context, CallService::class.java).apply {
                action = ACTION_INCOMING_CALL
                putExtra(EXTRA_CALLER_NAME, callerName)
                putExtra(EXTRA_ROOM_ID, roomId)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopCallService(context: Context) {
            val intent = Intent(context, CallService::class.java).apply {
                action = ACTION_DECLINE_CALL
            }
            context.startService(intent)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_INCOMING_CALL -> {
                val callerName = intent.getStringExtra(EXTRA_CALLER_NAME) ?: "Partner"
                val roomId = intent.getStringExtra(EXTRA_ROOM_ID) ?: "default-room"
                showIncomingCallNotification(callerName, roomId)
            }
            ACTION_ACCEPT_CALL -> {
                val roomId = intent.getStringExtra(EXTRA_ROOM_ID) ?: "default-room"
                val callerName = intent.getStringExtra(EXTRA_CALLER_NAME) ?: "Partner"
                
                // Open active call activity
                val callIntent = Intent(this, CallActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    putExtra(CallActivity.EXTRA_ROOM_ID, roomId)
                    putExtra(CallActivity.EXTRA_PARTNER_NAME, callerName)
                }
                startActivity(callIntent)
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
            ACTION_DECLINE_CALL -> {
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    private fun showIncomingCallNotification(callerName: String, roomId: String) {
        val callerPerson = Person.Builder()
            .setName(callerName)
            .setImportant(true)
            .build()

        // Full Screen Intent (Triggers full incoming call UI even when phone is locked)
        val fullScreenIntent = Intent(this, IncomingCallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_CALLER_NAME, callerName)
            putExtra(EXTRA_ROOM_ID, roomId)
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            0,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Accept Intent
        val acceptIntent = Intent(this, CallService::class.java).apply {
            action = ACTION_ACCEPT_CALL
            putExtra(EXTRA_ROOM_ID, roomId)
            putExtra(EXTRA_CALLER_NAME, callerName)
        }
        val acceptPendingIntent = PendingIntent.getService(
            this,
            1,
            acceptIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Decline Intent
        val declineIntent = Intent(this, CallService::class.java).apply {
            action = ACTION_DECLINE_CALL
        }
        val declinePendingIntent = PendingIntent.getService(
            this,
            2,
            declineIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Build CallStyle notification (Used by WhatsApp & Messenger for incoming VoIP)
        val notificationBuilder = NotificationCompat.Builder(this, AmorBridgeApplication.CALL_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_phone_call)
            .setContentTitle("Incoming Video Call")
            .setContentText("$callerName is video calling you...")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setAutoCancel(true)
            .setOngoing(true)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setStyle(
                NotificationCompat.CallStyle.forIncomingCall(
                    callerPerson,
                    declinePendingIntent,
                    acceptPendingIntent
                )
            )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notificationBuilder.build(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL
            )
        } else {
            startForeground(NOTIFICATION_ID, notificationBuilder.build())
        }
    }
}
