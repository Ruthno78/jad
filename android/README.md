# JadStack Lotto v6.3 — APK Native (Kotlin + WebView + Q2i)

## Sa ki nan v6.3
1. Q2i Bluetooth ESC/POS printer integre (AndroidPrinter.kt)
2. Sove Tiraj (pos-total) fiks: sticky → fixed
3. Z-index echèl santralize
4. Bouton primary min 48px sou mobil
5. v57 + v58 + v63 CSS fixes ajoute
6. Splash theme fiks
7. Adaptive icon Android 8+
8. Bluetooth permissions nan Manifest
9. Mode nwa (values-night)

## Bati
cd android
./gradlew assembleRelease
./gradlew assembleDebug

## Q2i Printer Setup
1. Pair Q2i printer nan Android Bluetooth Settings
2. Bati ak install APK la
3. Nan paj Ajan -> POS -> peze "Konekte Q2i"
4. Peze "Teste Printer" pou verifye
5. Lè w valide yon tikè, li enprime otomatikman

## URL konfigirab
Chanje app/src/main/res/values/strings.xml -> site_url / site_host
