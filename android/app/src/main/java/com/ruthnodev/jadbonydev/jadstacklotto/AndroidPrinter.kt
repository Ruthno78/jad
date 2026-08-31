package com.ruthnodev.jadbonydev.jadstacklotto

import android.Manifest
import android.app.Activity
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.pm.PackageManager
import android.os.Build
import android.webkit.JavascriptInterface
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.io.OutputStream
import java.nio.charset.Charset
import java.util.UUID

// === Bluetooth ESC/POS Printer Bridge (Q2i) ===
class AndroidPrinter(private val activity: Activity?) {

    companion object {
        private val SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
        private const val REQ_BT = 4711
    }

    private var socket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null

    @JavascriptInterface
    fun hasPermissions(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        if (activity == null) return false
        return ContextCompat.checkSelfPermission(activity, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED &&
               ContextCompat.checkSelfPermission(activity, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
    }

    @JavascriptInterface
    fun requestPermissions(): String {
        if (hasPermissions()) return "OK"
        if (activity == null) return "Tanpri bay pèmisyon Bluetooth nan Settings."
        try {
            activity.runOnUiThread {
                ActivityCompat.requestPermissions(activity, arrayOf(
                    Manifest.permission.BLUETOOTH_CONNECT,
                    Manifest.permission.BLUETOOTH_SCAN
                ), REQ_BT)
            }
        } catch (e: Exception) {
            return "Pèmisyon Bluetooth pa ka mande: ${e.message}"
        }
        return "Tanpri bay pèmisyon Bluetooth la epi eseye ankò."
    }

    @JavascriptInterface
    fun connect(): String {
        try {
            if (!hasPermissions()) return requestPermissions()
            val adapter = BluetoothAdapter.getDefaultAdapter() ?: return "Bluetooth pa disponib sou telefòn nan."
            if (!adapter.isEnabled) return "Tanpri aktive Bluetooth."
            val devices = adapter.bondedDevices ?: return "Pa gen printer ki deja paired."
            if (devices.isEmpty()) return "Pa gen printer ki deja paired."
            var printer: BluetoothDevice? = null
            for (device in devices) {
                val name = device.name ?: continue
                val n = name.lowercase()
                if (n.contains("q2i") || n.contains("printer") || n.contains("thermal")) {
                    printer = device
                    break
                }
            }
            if (printer == null) return "Q2i pa jwenn. Tanpri pair printer la nan Bluetooth Settings."
            disconnect()
            socket = printer.createRfcommSocketToServiceRecord(SPP_UUID)
            socket!!.connect()
            outputStream = socket!!.getOutputStream()
            return "OK"
        } catch (e: SecurityException) {
            return "Bluetooth permission refize."
        } catch (e: Exception) {
            return "Connection error: ${e.message}"
        }
    }

    @JavascriptInterface
    fun isConnected(): Boolean {
        return try {
            socket != null && socket!!.isConnected && outputStream != null
        } catch (e: Exception) { false }
    }

    @JavascriptInterface
    fun print(text: String): String {
        try {
            if (socket == null || !socket!!.isConnected) return "Printer pa konekte."
            if (outputStream == null) return "OutputStream pa disponib."
            outputStream!!.write(byteArrayOf(0x1B, 0x40))
            outputStream!!.write(text.toByteArray(Charset.forName("UTF-8")))
            outputStream!!.write(byteArrayOf(0x0A, 0x0A, 0x0A))
            outputStream!!.flush()
            return "PRINT_OK"
        } catch (e: SecurityException) {
            return "Bluetooth permission refize."
        } catch (e: Exception) {
            return "Print error: ${e.message}"
        }
    }

    @JavascriptInterface
    fun disconnect(): String {
        try {
            outputStream?.close()
            socket?.close()
        } catch (_: Exception) {}
        outputStream = null
        socket = null
        return "DISCONNECTED"
    }
}
