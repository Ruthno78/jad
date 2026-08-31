package com.ruthnodev.jadbonydev.jadstacklotto

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

// === Kanal Notifikasyon: Aksyon Rapid ===
object PushNotificationHelper {

    const val CHANNEL_ID_QUICK_ACTIONS = "jl_quick_actions"
    const val EXTRA_REDIRECT_PATH = "redirect_path"

    fun ensureChannels(ctx: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val quickChannel = NotificationChannel(
            CHANNEL_ID_QUICK_ACTIONS,
            ctx.getString(R.string.quick_actions_channel_name),
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = ctx.getString(R.string.quick_actions_channel_desc)
            setShowBadge(false)
        }
        nm.createNotificationChannel(quickChannel)
    }
}
