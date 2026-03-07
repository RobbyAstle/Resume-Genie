#!/usr/bin/env node

/**
 * build-standalone.mjs
 *
 * Produces a self-contained ZIP that bundles:
 *   - Next.js standalone server
 *   - Static assets & public/ files
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

// ---------------------------------------------------------------------------
// Step 1: Build Next.js
// ---------------------------------------------------------------------------

console.log("Step 1: Building Next.js (standalone output)...")
exec("npx next build")

const standaloneDir = path.join(ROOT, ".next", "standalone")
if (!fs.existsSync(standaloneDir)) {
  throw new Error(".next/standalone/ not found. Ensure next.config.ts has output: 'standalone'")
}

// ---------------------------------------------------------------------------
// Step 2: Prepare staging directory
// ---------------------------------------------------------------------------

console.log("\nStep 2: Preparing staging directory...")
await rmrf(STAGE)
await fsp.mkdir(STAGE, { recursive: true })

// Copy standalone server files
await copyDir(standaloneDir, STAGE)

// Copy static assets (Next.js standalone does not include these)
const staticSrc = path.join(ROOT, ".next", "static")
const staticDest = path.join(STAGE, ".next", "static")
if (fs.existsSync(staticSrc)) {
  await copyDir(staticSrc, staticDest)
}

// Copy public/ directory
const publicSrc = path.join(ROOT, "public")
const publicDest = path.join(STAGE, "public")
if (fs.existsSync(publicSrc)) {
  await copyDir(publicSrc, publicDest)
}

// Patch: pnpm's symlink structure can cause Next.js standalone to miss
// peer dependencies like styled-jsx. Copy them from the pnpm store if missing.
const peerDeps = ["styled-jsx", "@swc/helpers"]
const pnpmStore = path.join(ROOT, "node_modules", ".pnpm")
for (const dep of peerDeps) {
  const destPkg = path.join(STAGE, "node_modules", dep)
  if (!fs.existsSync(destPkg)) {
    // pnpm encodes scoped package names with "+" instead of "/" in store dirs
    // e.g. "@swc/helpers" → "@swc+helpers@0.5.15"
    const storePrefix = dep.replace("/", "+")
    const storeEntries = fs.readdirSync(pnpmStore).filter((d) => d.startsWith(storePrefix + "@"))
    if (storeEntries.length > 0) {
      const src = path.join(pnpmStore, storeEntries[0], "node_modules", dep)
      if (fs.existsSync(src)) {
        await copyDir(src, destPkg)
        console.log(`  ✓ Patched missing peer dep: ${dep}`)
      }
    }
  }
}

console.log("  ✓ Standalone files staged")

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
  exec(
    `"${browsersCli}" install chrome@${CHROME_VERSION} --platform win64 --install-dir "${chromeDir}"`,
  )
  // Find the chrome.exe and move it to chrome/ root for simpler paths
  // @puppeteer/browsers installs to: chrome/<platform>-<version>/chrome-win64/chrome.exe
  const installed = findFileRecursive(chromeDir, "chrome.exe")
  if (installed) {
    const installedDir = path.dirname(installed)
    // Move all files from the nested directory up to chromeDir
    await moveContentsUp(installedDir, chromeDir)
  }

} else if (targetOS === "darwin") {
  const chromePlatform = targetArch === "arm64" ? "mac_arm" : "mac"
  exec(
    `"${browsersCli}" install chrome@${CHROME_VERSION} --platform ${chromePlatform} --install-dir "${chromeDir}"`,
  )
  // On Mac, the binary is inside a .app bundle
  // Find "Google Chrome for Testing.app" or similar
  const installed = findFileRecursive(chromeDir, "Google Chrome for Testing")
  if (installed) {
    // The launcher script expects chrome/chrome, so create a symlink
    const link = path.join(chromeDir, "chrome")
    if (!fs.existsSync(link)) {
      await fsp.symlink(installed, link)
    }
  }
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
  exec(
    `powershell -Command "Compress-Archive -Path '${STAGE}/*' -DestinationPath '${zipPath}'"`,
  )
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

async function moveContentsUp(srcDir, destDir) {
  // Move all files from srcDir to destDir, then clean up intermediate dirs
  for (const entry of await fsp.readdir(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name)
    const dest = path.join(destDir, entry.name)
    if (!fs.existsSync(dest)) {
      await fsp.rename(src, dest)
    }
  }
  // Clean up empty intermediate directories
  let current = srcDir
  while (current !== destDir) {
    const entries = await fsp.readdir(current)
    if (entries.length === 0) {
      await fsp.rmdir(current)
    }
    current = path.dirname(current)
  }
}
