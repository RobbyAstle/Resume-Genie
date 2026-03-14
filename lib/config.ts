import "server-only"
import path from "path"

// ---------------------------------------------------------------------------
// Storage paths
// ---------------------------------------------------------------------------

export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data")

export const SESSIONS_DIR = path.join(DATA_DIR, "sessions")
export const PROFILES_DIR = path.join(DATA_DIR, "profiles")
export const RESUMES_DIR = path.join(DATA_DIR, "resumes")
export const API_KEYS_FILE = path.join(DATA_DIR, "api_keys.json")

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export const TEMPLATES_DIR = path.join(process.cwd(), "public", "templates")

export const TEMPLATE_IDS = ["classic", "modern", "minimal", "signature"] as const
export type TemplateId = (typeof TEMPLATE_IDS)[number]

// ---------------------------------------------------------------------------
// AI timeouts (milliseconds)
// ---------------------------------------------------------------------------

export const AI_TIMEOUT_MS = 60_000        // 60 s — general AI calls
export const AI_RESUME_TIMEOUT_MS = 90_000 // 90 s — resume generation (larger output)

// ---------------------------------------------------------------------------
// PDF generation
// ---------------------------------------------------------------------------

export const PDF_TIMEOUT_MS = 30_000 // 30 s — Puppeteer render timeout

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export const APP_NAME = "Resume Genie"
