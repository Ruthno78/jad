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

## Bati (lokal)
`android/app/src/main/assets/public/` PA nan git — se yon kopi jenere ki soti
nan `public/` (sous vre a). Toujou senkronize l anvan w bati:

```sh
./scripts/sync-android-assets.sh   # kopye public/ -> android/app/src/main/assets/public/
cd android
./gradlew assembleDebug
./gradlew assembleRelease
```

Si w pa fè etap senkronizasyon an, WebView a pap jwenn okenn paj (auth.html
elatriye) paske dosye assets/public la ap vid oswa pa la ditou.

Nan GitHub Actions (`.github/workflows/build-apk.yml`), senkronizasyon an fèt
otomatikman anvan `gradlew` — pa gen anyen pou fè a la men.

## Q2i Printer Setup
1. Pair Q2i printer nan Android Bluetooth Settings
2. Bati ak install APK la
3. Nan paj Ajan -> POS -> peze "Konekte Q2i"
4. Peze "Teste Printer" pou verifye
5. Lè w valide yon tikè, li enprime otomatikman

## URL WebView (100% lokal)
`site_url` nan `app/src/main/res/values/strings.xml` pwente sou yon fichye
lokal anndan APK a — PA yon sit sou entènèt:

```
file:///android_asset/public/auth.html
```

`auth.html` se premye paj WebView a lanse (paj koneksyon/otantifikasyon).
Sèl domèn app la kontakte sou rezo a se `supabase.co` (API/Storage) — sa
konfigire nan `app/src/main/res/xml/network_security_config.xml`.
