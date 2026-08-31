# V82 iOS biometric bridge

The V81 package contains an Android native host but no Xcode/iOS project. This folder therefore contains the native iOS `LocalAuthentication` bridge source only; it is not a claim that an iOS app was built or tested in this environment.

Integrate the class into the actual iOS/Capacitor host and expose an equivalent `JadStackBiometric` bridge to the web layer. Add the required `NSFaceIDUsageDescription` to the app's Info.plist. Apple performs the biometric match; the web app receives only success/failure.
