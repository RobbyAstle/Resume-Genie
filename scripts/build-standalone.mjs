#!/usr/bin/env node

/**
 * build-standalone.mjs
 *
 * Produces a self-contained ZIP that bundles:
 *   - Next.js build output (.next/) with node_modules/
 *   - Public assets, data directory, config files
 *   - Node.js runtime binary
 *   - Chromium binary (for Puppeteer PDF generation)
 *   - Platform-specific launcher script
 *
 * Usage:
 *   node scripts/build-standalone.mjs --platform win32-x64
 *   node scripts/build-standalone.mjs --platform darwin-arm64
 *   node scripts/build-standalone.mjs --platform darwin-x64
 *
 * If --platform is omitted, defaults to the current OS + arch.
 */

import { execSync } from "child_process"
import fs from "fs"
import fsp from "fs/promises"
import path from "path"
import { pipeline } from "stream/promises"
import { createWriteStream } from "fs"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, "..")

// ---------------------------------------------------------------------------
// Parse args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const platformFlag = args.find((a) => a.startsWith("--platform="))?.split("=")[1]
  ?? args[args.indexOf("--platform") + 1]
  ?? `${process.platform}-${process.arch}`

const VALID_PLATFORMS = ["win32-x64", "darwin-arm64", "darwin-x64"]
if (!VALID_PLATFORMS.includes(platformFlag)) {
  console.error(`Invalid platform: ${platformFlag}`)
  console.error(`Valid platforms: ${VALID_PLATFORMS.join(", ")}`)
  process.exit(1)
}

const [targetOS, targetArch] = platformFlag.split("-")
console.log(`\n📦 Building standalone package for ${targetOS}-${targetArch}\n`)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIST = path.join(ROOT, "dist")
const STAGE = path.join(DIST, `ResumeGenie-${targetOS}-${targetArch}`)
const NODE_VERSION = "20.19.0"

// Chromium revision — must match what @puppeteer/browsers supports
// Using a known-good Chrome for Testing version
const CHROME_VERSION = "131.0.6778.264"

// Expected SHA-256 checksums for Node.js v20.19.0 binaries
// Source: https://nodejs.org/dist/v20.19.0/SHASUMS256.txt
const NODE_CHECKSUMS = {
  "win32-x64": "be72284c7bc62de07d5a9fd0ae196879842c085f11f7f2b60bf8864c0c9d6a4f",
  "darwin-arm64": "c016cd1975a264a29dc1b07c6fbe60d5df0a0c2beb4113c0450e3d998d1a0d9c",
  "darwin-x64": "a8554af97d6491fdbdabe63d3a1cfb9571228d25a3ad9aed2df856facb131b20",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyChecksum(filePath, expectedHash) {
  const { createHash } = await import("crypto")
  const fileBuffer = await fsp.readFile(filePath)
  const actual = createHash("sha256").update(fileBuffer).digest("hex")
  if (actual !== expectedHash) {
    throw new Error(
      `Checksum mismatch for ${path.basename(filePath)}!\n` +
      `  Expected: ${expectedHash}\n` +
      `  Actual:   ${actual}`
    )
  }
  console.log(`  ✓ Checksum verified: ${path.basename(filePath)}`)
}

async function downloadFile(url, dest) {
  console.log(`  ↓ Downloading ${url}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`)
  await fsp.mkdir(path.dirname(dest), { recursive: true })
  await pipeline(res.body, createWriteStream(dest))
}

async function rmrf(dir) {
  await fsp.rm(dir, { recursive: true, force: true })
}

async function copyDir(src, dest) {
  await fsp.cp(src, dest, { recursive: true, dereference: true })
}

function exec(cmd, opts = {}) {
  console.log(`  $ ${cmd}`)
  execSync(cmd, { stdio: "inherit", cwd: ROOT, ...opts })
}

function getPnpmPath() {
  try {
    execSync("pnpm --version", { stdio: "ignore" })
    return "pnpm"
  } catch {
    // Fallback for Windows where pnpm may not be on PATH
    const fallback = path.join(process.env.APPDATA || "", "npm", "pnpm.cmd")
    if (fs.existsSync(fallback)) return `"${fallback}"`
    throw new Error("pnpm not found. Install it globally: npm install -g pnpm")
  }
}

const PNPM = getPnpmPath()

// ---------------------------------------------------------------------------
// Step 1: Build Next.js
// ---------------------------------------------------------------------------

console.log("Step 1: Building Next.js...")
exec("npx next build")

const nextDir = path.join(ROOT, ".next")
if (!fs.existsSync(nextDir)) {
  throw new Error(".next/ not found. Build failed.")
}

// ---------------------------------------------------------------------------
// Step 2: Prepare staging directory
// ---------------------------------------------------------------------------

console.log("\nStep 2: Preparing staging directory...")
await rmrf(STAGE)
await fsp.mkdir(STAGE, { recursive: true })

// Copy .next/ build output
await copyDir(nextDir, path.join(STAGE, ".next"))

// Copy package.json and lockfile (needed by pnpm install)
await fsp.copyFile(path.join(ROOT, "package.json"), path.join(STAGE, "package.json"))
await fsp.copyFile(path.join(ROOT, "pnpm-lock.yaml"), path.join(STAGE, "pnpm-lock.yaml"))

// Write a staging .npmrc that uses hoisted node_modules (flat layout like npm).
// This avoids pnpm's symlink-based virtual store, so packages like styled-jsx
// that next expects to resolve from the top-level context are found correctly.
await fsp.writeFile(path.join(STAGE, ".npmrc"), [
  "package-manager-strict=false",
  "node-linker=hoisted",
  "",
].join("\n"))

// Install only production dependencies (excludes TypeScript, ESLint, Tailwind, etc.)
// The hoisted linker produces a flat node_modules with no symlinks to dereference.
console.log("  Installing production dependencies...")
exec(`${PNPM} install --prod --frozen-lockfile`, { cwd: STAGE })

// Clean up pnpm artifacts (not needed at runtime)
await fsp.rm(path.join(STAGE, "pnpm-lock.yaml"))
await fsp.rm(path.join(STAGE, ".npmrc"))

// Copy public/ directory
const publicSrc = path.join(ROOT, "public")
const publicDest = path.join(STAGE, "public")
if (fs.existsSync(publicSrc)) {
  await copyDir(publicSrc, publicDest)
}

// Copy prompts.json (loaded at runtime by AI routes)
await fsp.copyFile(path.join(ROOT, "prompts.json"), path.join(STAGE, "prompts.json"))

// Copy data/ directory (runtime data — sessions, profiles, API keys)
const dataSrc = path.join(ROOT, "data")
if (fs.existsSync(dataSrc)) {
  await copyDir(dataSrc, path.join(STAGE, "data"))
}

console.log("  ✓ App files staged")

// ---------------------------------------------------------------------------
// Step 3: Download Node.js binary
// ---------------------------------------------------------------------------

console.log("\nStep 3: Downloading Node.js runtime...")

const nodeDir = path.join(STAGE, "node")
await fsp.mkdir(nodeDir, { recursive: true })

if (targetOS === "win32") {
  const nodeUrl = `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip`
  const zipPath = path.join(DIST, "node.zip")
  await downloadFile(nodeUrl, zipPath)
  await verifyChecksum(zipPath, NODE_CHECKSUMS["win32-x64"])

  // Extract using PowerShell
  exec(`powershell -Command "Expand-Archive -Force '${zipPath}' '${DIST}/node-tmp'"`)
  // Move contents — Node.js zips have a top-level folder
  const extracted = path.join(DIST, "node-tmp", `node-v${NODE_VERSION}-win-x64`)
  await copyDir(extracted, nodeDir)
  await rmrf(path.join(DIST, "node-tmp"))
  await fsp.rm(zipPath)
  console.log("  ✓ Node.js downloaded (Windows x64)")

} else if (targetOS === "darwin") {
  const nodeUrl = `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-${targetArch}.tar.gz`
  const tarPath = path.join(DIST, "node.tar.gz")
  await downloadFile(nodeUrl, tarPath)
  await verifyChecksum(tarPath, NODE_CHECKSUMS[`darwin-${targetArch}`])

  exec(`tar -xzf "${tarPath}" -C "${DIST}"`)
  const extracted = path.join(DIST, `node-v${NODE_VERSION}-darwin-${targetArch}`)
  await copyDir(extracted, nodeDir)
  await rmrf(extracted)
  await fsp.rm(tarPath)
  console.log(`  ✓ Node.js downloaded (macOS ${targetArch})`)

} else {
  throw new Error(`Unsupported OS: ${targetOS}`)
}

// ---------------------------------------------------------------------------
// Step 4: Download Chromium (Chrome for Testing)
// ---------------------------------------------------------------------------

console.log("\nStep 4: Downloading Chromium...")

const chromeDir = path.join(STAGE, "chrome")
await fsp.mkdir(chromeDir, { recursive: true })

// Use @puppeteer/browsers CLI to install Chrome for Testing
// This handles platform detection and puts the binary in a known location
const browsersCli = path.join(ROOT, "node_modules", ".bin", "browsers")

if (targetOS === "win32") {
  // Download Chrome for Testing into a temp directory first, then flatten into chromeDir.
  // @puppeteer/browsers has a bug where --install-dir is sometimes ignored on Windows,
  // so we download into a known temp location and copy the result ourselves.
  const chromeTmp = path.join(DIST, "chrome-tmp")
  await rmrf(chromeTmp)
  await fsp.mkdir(chromeTmp, { recursive: true })
  exec(
    `"${browsersCli}" install chrome@${CHROME_VERSION} --platform win64 --install-dir "${chromeTmp}"`,
  )

  // Also check ROOT/chrome in case the CLI ignored --install-dir (known bug)
  let installed = findFileRecursive(chromeTmp, "chrome.exe")
  const rootChromeFallback = path.join(ROOT, "chrome")
  if (!installed && fs.existsSync(rootChromeFallback)) {
    console.log("  chrome.exe not in temp dir, checking ROOT/chrome fallback...")
    installed = findFileRecursive(rootChromeFallback, "chrome.exe")
  }

  if (!installed) {
    const tmpListing = fs.readdirSync(chromeTmp, { recursive: true }).slice(0, 30)
    console.error("  Contents of chrome-tmp:", tmpListing)
    throw new Error("chrome.exe not found after @puppeteer/browsers install")
  }

  console.log("  Found chrome.exe at:", installed)
  const installedDir = path.dirname(installed)

  // Copy chrome files to the staging chrome/ directory
  for (const entry of await fsp.readdir(installedDir, { withFileTypes: true })) {
    const src = path.join(installedDir, entry.name)
    const dest = path.join(chromeDir, entry.name)
    if (entry.isDirectory()) {
      await copyDir(src, dest)
    } else {
      await fsp.copyFile(src, dest)
    }
  }

  // Clean up temp download and any ROOT/chrome leftover
  await rmrf(chromeTmp)
  await rmrf(rootChromeFallback)

} else if (targetOS === "darwin") {
  const chromePlatform = targetArch === "arm64" ? "mac_arm" : "mac"
  const chromeTmp = path.join(DIST, "chrome-tmp")
  await rmrf(chromeTmp)
  await fsp.mkdir(chromeTmp, { recursive: true })
  exec(
    `"${browsersCli}" install chrome@${CHROME_VERSION} --platform ${chromePlatform} --install-dir "${chromeTmp}"`,
  )

  // Find the .app bundle (check temp dir first, then ROOT/chrome fallback)
  let installed = findFileRecursive(chromeTmp, "Google Chrome for Testing")
  const rootChromeFallback = path.join(ROOT, "chrome")
  if (!installed && fs.existsSync(rootChromeFallback)) {
    installed = findFileRecursive(rootChromeFallback, "Google Chrome for Testing")
  }

  if (!installed) {
    const tmpListing = fs.readdirSync(chromeTmp, { recursive: true }).slice(0, 30)
    console.error("  Contents of chrome-tmp:", tmpListing)
    throw new Error("Google Chrome for Testing not found after @puppeteer/browsers install")
  }

  console.log("  Found Chrome at:", installed)
  // Copy the .app bundle into chromeDir and create the symlink
  const appDest = path.join(chromeDir, path.basename(installed))
  await copyDir(installed, appDest)
  const link = path.join(chromeDir, "chrome")
  if (!fs.existsSync(link)) {
    await fsp.symlink(appDest, link)
  }

  // Clean up
  await rmrf(chromeTmp)
  await rmrf(rootChromeFallback)
}

console.log("  ✓ Chromium downloaded")

// ---------------------------------------------------------------------------
// Step 5: Copy launcher script
// ---------------------------------------------------------------------------

console.log("\nStep 5: Copying launcher script...")

if (targetOS === "win32") {
  await fsp.copyFile(
    path.join(ROOT, "scripts", "start.bat"),
    path.join(STAGE, "start.bat"),
  )
  console.log("  ✓ start.bat copied")
} else if (targetOS === "darwin") {
  await fsp.copyFile(
    path.join(ROOT, "scripts", "start.command"),
    path.join(STAGE, "start.command"),
  )
  // Make executable
  await fsp.chmod(path.join(STAGE, "start.command"), 0o755)
  console.log("  ✓ start.command copied")
}

// ---------------------------------------------------------------------------
// Step 6: Create ZIP
// ---------------------------------------------------------------------------

console.log("\nStep 6: Creating ZIP archive...")

const zipName = `ResumeGenie-${targetOS}-${targetArch}.zip`
const zipPath = path.join(DIST, zipName)

if (fs.existsSync(zipPath)) await fsp.rm(zipPath)

if (targetOS === "win32") {
  // Use 7-Zip if available (no size limit; pre-installed on GitHub Actions runners).
  // Fall back to PowerShell Compress-Archive, which has a 2GB limit.
  let use7z = false
  try {
    execSync("7z", { stdio: "ignore" })
    use7z = true
  } catch {}

  if (use7z) {
    exec(`7z a -tzip "${zipPath}" "${STAGE}/*"`)
  } else {
    console.warn("  ⚠ 7-Zip not found, falling back to Compress-Archive (2GB limit)")
    exec(
      `powershell -Command "Compress-Archive -Path '${STAGE}/*' -DestinationPath '${zipPath}'"`,
    )
  }
} else {
  exec(`cd "${DIST}" && zip -r "${zipName}" "ResumeGenie-${targetOS}-${targetArch}"`)
}

console.log(`\n✅ Build complete: dist/${zipName}\n`)

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

function findFileRecursive(dir, name) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.name === name) return full
    if (entry.isDirectory()) {
      const found = findFileRecursive(full, name)
      if (found) return found
    }
  }
  return null
}


