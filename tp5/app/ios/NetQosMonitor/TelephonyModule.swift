import Foundation
import CoreTelephony
import React

@objc(TelephonyModule)
class TelephonyModule: NSObject {
  private let network = CTTelephonyNetworkInfo()
  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(getSnapshot:rejecter:)
  func getSnapshot(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    let radios = Array(network.serviceCurrentRadioAccessTechnology?.values ?? Dictionary<String, String>().values)
    let raw = radios.first(where: { $0.contains("NR") }) ?? radios.first
    var radio: String? = nil
    if let raw = raw {
      if raw.contains("NR") { radio = "NR" }
      else if raw.contains("LTE") { radio = "LTE" }
      else if raw.contains("WCDMA") || raw.contains("HSDPA") || raw.contains("HSUPA") || raw.contains("eHRPD") || raw.contains("EVDO") { radio = "UMTS" }
      else { radio = "GSM" }
    }
    // iOS 16+ often returns a generic carrier name; never claim real RSSI.
    let carrier = network.serviceSubscriberCellularProviders?.values.first?.carrierName
    resolve(["operator": carrier as Any? ?? NSNull(), "radio": radio as Any? ?? NSNull(), "signalDbm": NSNull()])
  }
}
