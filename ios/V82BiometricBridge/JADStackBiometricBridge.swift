import Foundation
import LocalAuthentication

/// V82 reference bridge for a future Capacitor/iOS host.
/// Uses Apple's LocalAuthentication framework; no face image or biometric template is exposed.
final class JADStackBiometricBridge {
    func authenticate(reason: String, completion: @escaping (Bool, String) -> Void) {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            completion(false, error?.localizedDescription ?? "Biometric authentication unavailable.")
            return
        }
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                               localizedReason: reason) { success, authError in
            DispatchQueue.main.async {
                completion(success, authError?.localizedDescription ?? "")
            }
        }
    }
}
