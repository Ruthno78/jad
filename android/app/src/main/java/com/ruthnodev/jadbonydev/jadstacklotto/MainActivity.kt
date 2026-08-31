package com.ruthnodev.jadbonydev.jadstacklotto

import android.Manifest
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.webkit.*
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.ruthnodev.jadbonydev.jadstacklotto.databinding.ActivityMainBinding

// === Activité Principale (WebView Shell) ===
class MainActivity : AppCompatActivity() {

    companion object {
        @Volatile var isForeground: Boolean = false
        private var activeInstance: MainActivity? = null

        fun evaluateJsOnActiveInstance(js: String) {
            activeInstance?.webViewEvaluate(js)
        }
    }

    private lateinit var b: ActivityMainBinding
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pendingDownload: (() -> Unit)? = null
    private var lastBackPress = 0L
    private lateinit var printerBridge: AndroidPrinter
    private lateinit var biometricBridge: BiometricBridge
    private lateinit var pushBridge: AndroidPush
    private var pendingRedirect: String? = null

    // Dènye URL "reyèl" (http/https) WebView a t'ap eseye chaje.
    // Sa a se sa n'ap rechaje si koneksyon an tonbe epi retounen, olye de yon
    // domèn fiks ki ta ka mennen nan yon lòt paj (san logo/kontni reyèl la).
    private var lastRealUrl: String = ""

    // Kòd erè ki VRÈMAN vle di "pa gen entènèt / sèvè pa reponn".
    // Nou pa mete offline.html pou erè ki pa gen rapò ak rezo a
    // (tel:, mailto:, intent://, schèm apèl natif, elatriye) paske sa
    // yo ka rive menm lè entènèt ap mache byen e yo pa ta dwe bloke app la.
    private val networkErrorCodes = setOf(
        WebViewClient.ERROR_HOST_LOOKUP,
        WebViewClient.ERROR_CONNECT,
        WebViewClient.ERROR_TIMEOUT,
        WebViewClient.ERROR_IO,
        WebViewClient.ERROR_UNKNOWN,
        WebViewClient.ERROR_FAILED_SSL_HANDSHAKE
    )

    // Bridge JS ki pèmèt paj "pa gen entènèt" la (offline.html) mande app la
    // rechaje VRE paj sit la t'ap eseye chaje a, olye de yon adrès fiks.
    inner class NativeBridge {
        @android.webkit.JavascriptInterface
        fun retry() {
            runOnUiThread {
                val target = if (lastRealUrl.isNotBlank()) lastRealUrl else getString(R.string.site_url)
                b.webView.loadUrl(target)
            }
        }
    }

    private val fileChooser =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
            filePathCallback?.onReceiveValue(uris)
            filePathCallback = null
        }

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { grants ->
            val ok = grants.values.all { it }
            if (ok) pendingDownload?.invoke()
            else Toast.makeText(this, R.string.perm_needed, Toast.LENGTH_LONG).show()
            pendingDownload = null
        }

    // === Initialisation de la WebView et des bridges natifs ===
    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityMainBinding.inflate(layoutInflater)
        setContentView(b.root)

        printerBridge = AndroidPrinter(this)
        biometricBridge = BiometricBridge(this)
        pushBridge = AndroidPush(this)
        PushNotificationHelper.ensureChannels(this)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissionLauncher.launch(arrayOf(Manifest.permission.POST_NOTIFICATIONS))
        }

        pendingRedirect = intent?.getStringExtra(PushNotificationHelper.EXTRA_REDIRECT_PATH)

        val siteHost = getString(R.string.site_host)

        with(b.webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            loadWithOverviewMode = true
            useWideViewPort = true
            mediaPlaybackRequiresUserGesture = false
            javaScriptCanOpenWindowsAutomatically = true
            allowFileAccess = true
            allowContentAccess = true
            setSupportMultipleWindows(false)
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }

        b.webView.addJavascriptInterface(printerBridge, "AndroidPrinter")
        b.webView.addJavascriptInterface(biometricBridge, "JadStackBiometric")
        b.webView.addJavascriptInterface(pushBridge, "AndroidPush")
        b.webView.addJavascriptInterface(NativeBridge(), "NativeBridge")
        CookieManager.getInstance().setAcceptThirdPartyCookies(b.webView, true)
        b.webView.overScrollMode = WebView.OVER_SCROLL_IF_CONTENT_SCROLLS

        // === Scroll interne : SwipeRefreshLayout désactivé pour laisser
        // le scroll des conteneurs internes (ex: liste de chat) fonctionner ===
        b.swipe.isEnabled = false

        b.webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                val host = url.host ?: return true
                val internal = host == siteHost ||
                    host.endsWith(".$siteHost") ||
                    host.endsWith("supabase.co") ||
                    host.endsWith("base44.app")
                return if (internal && url.scheme == "https") false else {
                    openExternal(url); true
                }
            }

            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                // Konsève dènye URL http/https "reyèl" la (pa offline.html la)
                // pou nou ka retounen sou li si koneksyon an tounen.
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    lastRealUrl = url
                }
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                val scheme = request.url.scheme
                val isHttpNavigation = scheme == "http" || scheme == "https"
                // Sèlman montre paj "pa gen entènèt" la lè:
                // 1) se paj prensipal la (pa yon ti resous/iframe)
                // 2) se yon vrè URL http/https (pa tel:, mailto:, intent:, elatriye)
                // 3) kòd erè a se yon vrè erè rezo
                if (request.isForMainFrame && isHttpNavigation && error.errorCode in networkErrorCodes) {
                    view.loadUrl("file:///android_asset/offline.html")
                }
            }

            override fun onPageFinished(view: WebView, url: String) {
                b.swipe.isRefreshing = false
                firePendingRedirect()
            }
        }

        b.webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(webView: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback
                return try { fileChooser.launch(params.createIntent()); true }
                catch (e: ActivityNotFoundException) { filePathCallback = null; false }
            }
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread { request.grant(request.resources) }
            }
        }

        b.webView.setDownloadListener { url, ua, disp, mime, _ ->
            val run = { FileDownloader.enqueue(this, url, ua, disp, mime) }
            if (FileDownloader.needsLegacyStoragePermission()) {
                pendingDownload = run
                permissionLauncher.launch(arrayOf(
                    Manifest.permission.WRITE_EXTERNAL_STORAGE,
                    Manifest.permission.READ_EXTERNAL_STORAGE
                ))
            } else run()
        }

        b.swipe.setOnRefreshListener { b.webView.reload() }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (b.webView.canGoBack()) b.webView.goBack()
                else {
                    val now = System.currentTimeMillis()
                    if (now - lastBackPress < 2000) finish()
                    else { lastBackPress = now; Toast.makeText(this@MainActivity, R.string.exit_hint, Toast.LENGTH_SHORT).show() }
                }
            }
        })

        if (savedInstanceState == null) b.webView.loadUrl(getString(R.string.site_url))
        else b.webView.restoreState(savedInstanceState)
    }

    fun webViewEvaluate(js: String) {
        if (::b.isInitialized) runOnUiThread { b.webView.evaluateJavascript(js, null) }
    }

    // === Redirection Deep-Link depuis une notification (aksyon rapid) ===
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val redirect = intent.getStringExtra(PushNotificationHelper.EXTRA_REDIRECT_PATH)
        if (!redirect.isNullOrBlank()) {
            pendingRedirect = redirect
            firePendingRedirect()
        }
    }

    private fun firePendingRedirect() {
        val link = pendingRedirect ?: return
        pendingRedirect = null
        if (link.isBlank()) return
        val escaped = link.replace("\\", "\\\\").replace("\"", "\\\"")
        webViewEvaluate(
            "window.LotriShell && window.LotriShell.go && window.LotriShell.go(\"$escaped\");"
        )
    }

    override fun onResume() {
        super.onResume()
        isForeground = true
        activeInstance = this
        pushBridge.clearBadge()
    }

    override fun onPause() {
        super.onPause()
        isForeground = false
        if (activeInstance === this) activeInstance = null
    }

    private fun openExternal(uri: Uri) {
        try { startActivity(Intent(Intent.ACTION_VIEW, uri).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }) }
        catch (e: ActivityNotFoundException) { Toast.makeText(this, uri.toString(), Toast.LENGTH_SHORT).show() }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        b.webView.saveState(outState)
    }

    override fun onDestroy() {
        super.onDestroy()
        try { printerBridge.disconnect() } catch (_: Exception) {}
    }
}
