# Android release build

This Mac doesn't have Java or the Android SDK yet. Install **Android Studio** (it brings both), then:

1. **Upload key** (once — keep it and its passwords safe, outside the repo; with Play App Signing a lost upload key can be reset by Google support):

       keytool -genkeypair -v -keystore ~/keys/bistro-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000

2. Create `android/keystore.properties` (git-ignored):

       storeFile=/Users/<you>/keys/bistro-upload.jks
       storePassword=…
       keyAlias=upload
       keyPassword=…

3. Bump `versionCode` (+1 every upload) and `versionName` in `android/app/build.gradle`.
4. `npm run app`, then `cd android && ./gradlew bundleRelease` → `android/app/build/outputs/bundle/release/app-release.aab`.
5. Play Console → create the app (`com.bistroisland.app`), enable Play App Signing, upload the .aab to Internal testing first.
6. Play Console → Setup → App signing → copy the **app signing** SHA-256 and run `PLAY_SHA256=… node tools/well-known.mjs` so website links open the app.
7. Fill the Data safety form from `docs/play-data-safety.md`, the listing from `docs/store-listing.md`, screenshots from `docs/store/`.
