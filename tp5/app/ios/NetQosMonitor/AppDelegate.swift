import UIKit
import GoogleMaps
import TSBackgroundFetch

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    if let key = Bundle.main.object(forInfoDictionaryKey: "MapsAPIKey") as? String, !key.isEmpty, !key.hasPrefix("$(") {
      GMSServices.provideAPIKey(key)
    }
    TSBackgroundFetch.sharedInstance().didFinishLaunching()
    return true
  }
}
