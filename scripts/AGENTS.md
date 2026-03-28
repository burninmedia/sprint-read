# scripts/ — Agent Context

Build-time Node.js scripts. Not bundled into the app.

## generate-icons.mjs

Generates all required app icon sizes for Android and iOS from `public/icon.svg` using the `sharp` image library.

Run via:
```bash
npm run generate-icons
```

Outputs:
- Android: `android/app/src/main/res/mipmap-*/ic_launcher*.png` (multiple densities)
- iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/*.png`

Only needs to be re-run if the icon design changes.
