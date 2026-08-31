package com.ruthnodev.jadbonydev.jadstacklotto

import android.webkit.JavascriptInterface
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import android.content.Context
import android.os.Handler
import android.os.Looper

// === Biometric Authentication Bridge (Empreinte / Face) ===
class BiometricBridge(private val activity: MainActivity) {
    private val main = Handler(Looper.getMainLooper())

    @JavascriptInterface
    fun isAvailable(): Boolean {
        val manager = BiometricManager.from(activity)
        return manager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG or
                BiometricManager.Authenticators.BIOMETRIC_WEAK
        ) == BiometricManager.BIOMETRIC_SUCCESS
    }

    @JavascriptInterface
    fun authenticate(reason: String) {
        main.post {
            val manager = BiometricManager.from(activity)
            val authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG or
                BiometricManager.Authenticators.BIOMETRIC_WEAK
            val state = manager.canAuthenticate(authenticators)
            if (state != BiometricManager.BIOMETRIC_SUCCESS) {
                sendResult(false, "Biometric Face/Fingerprint pa disponib sou aparèy sa a.")
                return@post
            }

            val executor = ContextCompat.getMainExecutor(activity)
            val prompt = BiometricPrompt(activity, executor,
                object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                        super.onAuthenticationSucceeded(result)
                        sendResult(true, "", "device-biometric")
                    }

                    override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                        super.onAuthenticationError(errorCode, errString)
                        sendResult(false, errString.toString())
                    }

                    override fun onAuthenticationFailed() {
                        super.onAuthenticationFailed()
                    }
                })

            val info = BiometricPrompt.PromptInfo.Builder()
                .setTitle("JADSTACK LOTTO")
                .setSubtitle("Verifikasyon Super Admin / Mini Super Admin")
                .setDescription(reason)
                .setAllowedAuthenticators(authenticators)
                .setNegativeButtonText("Anile")
                .build()

            try {
                prompt.authenticate(info)
            } catch (e: Exception) {
                sendResult(false, e.message ?: "Biometric authentication unavailable.")
            }
        }
    }

    private fun sendResult(ok: Boolean, error: String, method: String = "") {
        val js = "window.__jadstackBiometricResolve && window.__jadstackBiometricResolve({ok:" +
            ok.toString() + ",error:" + jsString(error) + ",method:" + jsString(method) + "});"
        main.post { activity.runOnUiThread { activity.webViewEvaluate(js) } }
    }

    private fun jsString(value: String): String =
        "'" + value.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "\\r") + "'"
}
