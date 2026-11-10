package ar.edu.netqos

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.*
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*

/** Read-only cached telephony snapshot. Runtime permission prompts live in JS.
 * Never infer dBm from a level (0..4); unavailable values are explicit null. */
class TelephonyModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "TelephonyModule"
  private fun allowed(permission: String) = ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED

  @ReactMethod
  fun getSnapshot(promise: Promise) {
    val result = Arguments.createMap()
    result.putNull("operator"); result.putNull("radio"); result.putNull("signalDbm")
    try {
      val manager = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
      if (manager == null) { promise.resolve(result); return }
      val operator = manager.networkOperatorName
      if (!operator.isNullOrBlank()) result.putString("operator", operator)
      if (allowed(Manifest.permission.READ_PHONE_STATE)) {
        val radio = when (manager.dataNetworkType) {
          TelephonyManager.NETWORK_TYPE_NR -> "NR"
          TelephonyManager.NETWORK_TYPE_LTE -> "LTE"
          TelephonyManager.NETWORK_TYPE_UMTS, TelephonyManager.NETWORK_TYPE_HSDPA,
          TelephonyManager.NETWORK_TYPE_HSUPA, TelephonyManager.NETWORK_TYPE_HSPA,
          TelephonyManager.NETWORK_TYPE_HSPAP, TelephonyManager.NETWORK_TYPE_EVDO_0,
          TelephonyManager.NETWORK_TYPE_EVDO_A, TelephonyManager.NETWORK_TYPE_EVDO_B -> "UMTS"
          TelephonyManager.NETWORK_TYPE_GPRS, TelephonyManager.NETWORK_TYPE_EDGE,
          TelephonyManager.NETWORK_TYPE_GSM, TelephonyManager.NETWORK_TYPE_CDMA,
          TelephonyManager.NETWORK_TYPE_1xRTT -> "GSM"
          else -> null
        }
        if (radio != null) result.putString("radio", radio)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          // SignalStrength API: cached active subscription, not a synthetic signal estimate.
          val dbm = manager.signalStrength?.cellSignalStrengths?.firstOrNull { it.dbm in -160..-1 }?.dbm
          if (dbm != null) result.putInt("signalDbm", dbm)
        }
      }
      if (allowed(Manifest.permission.ACCESS_FINE_LOCATION)) {
        val cell = manager.allCellInfo?.firstOrNull { it.isRegistered }
        val strength = when (cell) {
          is CellInfoLte -> cell.cellSignalStrength
          is CellInfoWcdma -> cell.cellSignalStrength
          is CellInfoGsm -> cell.cellSignalStrength
          is CellInfoCdma -> cell.cellSignalStrength
          else -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && cell is CellInfoNr) cell.cellSignalStrength else null
        }
        val dbm = strength?.dbm
        if (dbm != null && dbm in -160..-1) result.putInt("signalDbm", dbm)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && cell is CellInfoNr) result.putString("radio", "NR")
      }
    } catch (_: SecurityException) { /* Revoked permission: preserve nullable snapshot. */
    } catch (_: Exception) { /* Device without telephony or unsupported vendor API. */ }
    promise.resolve(result)
  }
}
