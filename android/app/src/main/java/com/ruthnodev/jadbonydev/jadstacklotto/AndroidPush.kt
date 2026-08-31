package com.ruthnodev.jadbonydev.jadstacklotto

import android.app.Activity
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.webkit.JavascriptInterface

// === JS <-> Android Bridge: Badj + Notifikasyon "Aksyon Rapid" ===
// Kote JS rele l: window.AndroidPush.xxx()
class AndroidPush(private val activity: Activity?) {

    private fun ctx(): Context? = activity?.applicationContext

    // Pa gen push natif (Firebase pa konfigire) — toujou retounen vid/false.
    @JavascriptInterface
    fun getPendingToken(): String = ""

    @JavascriptInterface
    fun isNativePushAvailable(): Boolean = false

    @JavascriptInterface
    fun startQuickActions(title: String, actionsJson: String) {
        val c = ctx() ?: return
        QuickActionsService.start(c, title, actionsJson)
    }

    @JavascriptInterface
    fun stopQuickActions() {
        val c = ctx() ?: return
        QuickActionsService.stop(c)
    }

    @JavascriptInterface
    fun clearBadge() {
        val c = ctx() ?: return
        try {
            val nm = c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                nm.activeNotifications
                    .filter { it.id != QuickActionsService.NOTIF_ID }
                    .forEach { nm.cancel(it.id) }
            } else {
                nm.cancelAll()
            }
        } catch (_: Exception) {}
    }
}
