#!/bin/zsh
# Build Bistro Island for the App Store and upload it to App Store Connect, in one go.
#   APPLE_TEAM_ID=XXXXXXXXXX ./tools/ios-release.sh
# Needs: Xcode 26 or later (Apple refuses uploads from older Xcode since April 28, 2026),
# CocoaPods, and your Apple Developer account signed in under Xcode → Settings → Accounts.
# The build number goes up by one each time; the version shown in the store follows version.json.
set -e
cd "$(dirname "$0")/.."
[[ -n "$APPLE_TEAM_ID" ]] || { echo "Set APPLE_TEAM_ID (Xcode → Settings → Accounts → your team → Team ID)"; exit 1; }
xcodebuild -version | head -1
major=$(xcodebuild -version | head -1 | sed -E 's/Xcode ([0-9]+).*/\1/'); (( major >= 26 )) || { echo "Xcode 26+ is required for App Store uploads"; exit 1; }

V=$(node -e "console.log(require('./version.json').v)")
B=$(( $(cat ios/.build-number 2>/dev/null || echo 0) + 1 )); echo $B > ios/.build-number
echo "Bistro Island $V (build $B)"

node tests/launch-check.mjs                                                       # dev tools must be off
node tools/app-web.mjs                                                          # the game → www/
npx cap sync ios                                                                # www/ + plugins → the Xcode project

OUT=build/ios; rm -rf $OUT; mkdir -p $OUT
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release -destination 'generic/platform=iOS' \
  -archivePath $OUT/BistroIsland.xcarchive DEVELOPMENT_TEAM=$APPLE_TEAM_ID CODE_SIGN_STYLE=Automatic \
  MARKETING_VERSION=$V CURRENT_PROJECT_VERSION=$B -allowProvisioningUpdates archive

cat > $OUT/ExportOptions.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>teamID</key><string>$APPLE_TEAM_ID</string>
  <key>signingStyle</key><string>automatic</string>
  <key>uploadSymbols</key><true/>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict></plist>
EOF
xcodebuild -exportArchive -archivePath $OUT/BistroIsland.xcarchive -exportOptionsPlist $OUT/ExportOptions.plist -exportPath $OUT -allowProvisioningUpdates
echo "Uploaded $V ($B). It appears in App Store Connect → TestFlight in about 10–30 minutes."
