import "server-only"
import crypto from "crypto"
import fs from "fs"
import path from "path"

// ---------------------------------------------------------------------------
// Key derivation
// ---------------------------------------------------------------------------
// A random 32-byte key is generated once and stored in a dotfile in the
// user's home directory. This means the encrypted API keys in data/ cannot be
// decrypted if the data/ folder is copied to another machine or committed
// to version control — the key file stays with the original machine.

const KEY_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE || process.cwd(),
  ".resume-genie-key"
)

function deriveKey(): Buffer {
  try {
    const existing = fs.readFileSync(KEY_PATH)
    if (existing.length === 32) return existing
  } catch {
    // Key file doesn't exist yet — generate one below
  }
  const key = crypto.randomBytes(32)
  fs.writeFileSync(KEY_PATH, key, { mode: 0o600 })
  return key
}

// ---------------------------------------------------------------------------
// encrypt / decrypt
// ---------------------------------------------------------------------------

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns a base64-encoded string in the format: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return ""
  const key = deriveKey()
  const iv = crypto.randomBytes(12) // 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":")
}

/**
 * Decrypt a ciphertext produced by `encrypt`.
 * Returns the original plaintext, or "" if decryption fails.
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ""
  try {
    const parts = ciphertext.split(":")
    if (parts.length !== 3) return ciphertext // not encrypted — return as-is
    const [ivB64, authTagB64, encB64] = parts
    const key = deriveKey()
    const iv = Buffer.from(ivB64, "base64")
    const authTag = Buffer.from(authTagB64, "base64")
    const encrypted = Buffer.from(encB64, "base64")
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(authTag)
    return decipher.update(encrypted).toString("utf8") + decipher.final("utf8")
  } catch {
    // Decryption failed (wrong key, corrupted data, or plaintext value)
    return ""
  }
}

/**
 * Returns true if the string looks like an encrypted value produced by encrypt().
 */
export function isEncrypted(value: string): boolean {
  return value.split(":").length === 3
}
