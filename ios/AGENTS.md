# ios/ — Agent Context

Capacitor-generated iOS project. Mirrors the Android project in structure. The web app is served from local assets inside the app bundle.

## How the Web App Gets In

```
npm run build       → dist/
npx cap sync ios    → ios/App/App/public/
```

Open `ios/App/App.xcodeproj` (or the `.xcworkspace` if using CocoaPods) in Xcode to build and run.

## Key Paths

| Path | Purpose |
|---|---|
| `App/App/AppDelegate.swift` | App entry point — Capacitor bridge init |
| `App/App/public/` | Built web app (same as Android assets) |
| `App/App/Assets.xcassets/` | App icon, splash image |
| `App/CapApp-SPM/` | Swift Package Manager integration for Capacitor plugins |

## Bundle ID

`com.sprintread.app` — set in Xcode project settings (PRODUCT_BUNDLE_IDENTIFIER).

## Deployment Target

iOS 14+ (set in Xcode). The Screen Wake Lock API (`navigator.wakeLock`) is supported in Safari/WKWebView from iOS 16.4. On older versions the wake lock silently no-ops.

## Building for App Store

1. `npm run build && npx cap sync ios`
2. Open `ios/App/App.xcodeproj` in Xcode
3. Select a real device or Any iOS Device target
4. Product → Archive
5. Distribute through App Store Connect
