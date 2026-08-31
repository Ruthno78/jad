package com.ruthnodev.jadbonydev.jadstacklotto

import android.app.Activity
import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.webkit.CookieManager
import android.webkit.URLUtil
import android.widget.Toast

// === Telechajman Tikè / PDF / Imaj → Download/JadStackLotto/ ===
object FileDownloader {

    fun enqueue(
        activity: Activity,
        url: String,
        userAgent: String?,
        contentDisposition: String?,
        mimeType: String?
    ) {
        try {
            val fileName = URLUtil.guessFileName(url, contentDisposition, mimeType)
            val request = DownloadManager.Request(Uri.parse(url)).apply {
                setMimeType(mimeType ?: "application/octet-stream")
                addRequestHeader("User-Agent", userAgent ?: "")
                CookieManager.getInstance().getCookie(url)?.let {
                    addRequestHeader("cookie", it)
                }
                setTitle(fileName)
                setDescription(activity.getString(R.string.app_name))
                setNotificationVisibility(
                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
                )
                setDestinationInExternalPublicDir(
                    Environment.DIRECTORY_DOWNLOADS,
                    "${activity.getString(R.string.download_dir)}/$fileName"
                )
                setAllowedOverMetered(true)
                setAllowedOverRoaming(true)
            }
            val dm = activity.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            dm.enqueue(request)
            Toast.makeText(activity, R.string.download_started, Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(activity, e.message ?: "Download error", Toast.LENGTH_LONG).show()
        }
    }

    fun needsLegacyStoragePermission(): Boolean = Build.VERSION.SDK_INT <= Build.VERSION_CODES.P
}
