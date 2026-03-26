/**
 * Generates resources/icon.png (1024×1024) and resources/splash.png (2732×2732)
 * used by @capacitor/assets to produce all platform icon sizes.
 *
 * Run:  node scripts/generate-icons.mjs
 * Requires: npm install -D sharp
 */
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const svgSource = readFileSync(path.join(root, 'public', 'icon.svg'))

// 1024×1024 app icon
await sharp(svgSource)
  .resize(1024, 1024)
  .png()
  .toFile(path.join(root, 'resources', 'icon.png'))

console.log('✓  resources/icon.png (1024×1024)')

// 2732×2732 splash — black background, centred icon at 400px
const splashSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732">
  <rect width="2732" height="2732" fill="#000000"/>
  <image href="data:image/svg+xml;base64,${svgSource.toString('base64')}"
         x="${(2732 - 400) / 2}" y="${(2732 - 400) / 2}" width="400" height="400"/>
</svg>`

await sharp(Buffer.from(splashSvg))
  .resize(2732, 2732)
  .png()
  .toFile(path.join(root, 'resources', 'splash.png'))

console.log('✓  resources/splash.png (2732×2732)')
console.log('\nNext: npx @capacitor/assets generate')
