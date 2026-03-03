import fs from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"
import {
  SESSIONS_DIR,
  PROFILES_DIR,
  API_KEYS_FILE,
  DATA_DIR,
} from "./config"
import { encrypt, decrypt } from "./encryption"
import type {
  Session,
  CandidateProfile,
  AppSettings,
} from "@/types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const text = await fs.readFile(filePath, "utf-8")
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

async function writeJson(filePath: string, data: unknown) {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8")
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

function sessionPath(id: string) {
  return path.join(SESSIONS_DIR, `${id}.json`)
}

export async function listSessions(): Promise<Session[]> {
  await ensureDir(SESSIONS_DIR)
  let files: string[]
  try {
    files = await fs.readdir(SESSIONS_DIR)
  } catch {
    return []
  }
  const sessions = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map((f) => readJson<Session>(path.join(SESSIONS_DIR, f)))
  )
  return (sessions.filter(Boolean) as Session[]).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export async function getSession(id: string): Promise<Session | null> {
  return readJson<Session>(sessionPath(id))
}

export async function createSession(
  jobTitle = "",
  company = ""
): Promise<Session> {
  const now = new Date().toISOString()
  const session: Session = {
    id: randomUUID(),
    jobTitle,
    company,
    jobDescription: "",
    profileId: null,
    templateId: null,
    pageCount: 1 as const,
    keywords: null,
    evaluation: null,
    resumeContent: null,
    pdfPath: null,
    interviewQuestions: [],
    interviewResponses: [],
    createdAt: now,
    updatedAt: now,
  }
  await writeJson(sessionPath(session.id), session)
  return session
}

export async function updateSession(
  id: string,
  patch: Partial<Omit<Session, "id" | "createdAt">>
): Promise<Session | null> {
  const existing = await getSession(id)
  if (!existing) return null
  const updated: Session = {
    ...existing,
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  }
  await writeJson(sessionPath(id), updated)
  return updated
}

export async function deleteSession(id: string): Promise<boolean> {
  try {
    await fs.unlink(sessionPath(id))
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

function profilePath(id: string) {
  return path.join(PROFILES_DIR, `${id}.json`)
}

export async function listProfiles(): Promise<CandidateProfile[]> {
  await ensureDir(PROFILES_DIR)
  let files: string[]
  try {
    files = await fs.readdir(PROFILES_DIR)
  } catch {
    return []
  }
  const profiles = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map((f) => readJson<CandidateProfile>(path.join(PROFILES_DIR, f)))
  )
  return profiles.filter(Boolean) as CandidateProfile[]
}

export async function getProfile(
  id: string
): Promise<CandidateProfile | null> {
  return readJson<CandidateProfile>(profilePath(id))
}

export async function upsertProfile(
  profile: CandidateProfile
): Promise<CandidateProfile> {
  const id = profile.id || randomUUID()
  const now = new Date().toISOString()
  const saved: CandidateProfile = { ...profile, id, updatedAt: now }
  await writeJson(profilePath(id), saved)
  return saved
}

export async function deleteProfile(id: string): Promise<boolean> {
  try {
    await fs.unlink(profilePath(id))
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Settings (api keys)
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS: AppSettings = {
  provider: "openai",
  openaiKey: "",
  anthropicKey: "",
}

// Raw settings as stored on disk (keys encrypted)
type StoredSettings = {
  provider: AppSettings["provider"]
  openaiKey: string
  anthropicKey: string
}

export async function getSettings(): Promise<AppSettings> {
  await ensureDir(DATA_DIR)
  const stored = (await readJson<StoredSettings>(API_KEYS_FILE)) ?? DEFAULT_SETTINGS
  return {
    provider: stored.provider,
    openaiKey: stored.openaiKey ? decrypt(stored.openaiKey) : "",
    anthropicKey: stored.anthropicKey ? decrypt(stored.anthropicKey) : "",
  }
}

export async function saveSettings(
  patch: Partial<AppSettings>
): Promise<AppSettings> {
  const current = await getSettings()
  const merged: AppSettings = { ...current, ...patch }
  const toStore: StoredSettings = {
    provider: merged.provider,
    openaiKey: merged.openaiKey ? encrypt(merged.openaiKey) : "",
    anthropicKey: merged.anthropicKey ? encrypt(merged.anthropicKey) : "",
  }
  await writeJson(API_KEYS_FILE, toStore)
  return merged
}

// ---------------------------------------------------------------------------
// PDF storage path helper
// ---------------------------------------------------------------------------

export async function pdfOutputPath(sessionId: string): Promise<string> {
  const dir = path.join(DATA_DIR, "pdfs")
  await ensureDir(dir)
  return path.join(dir, `${sessionId}.pdf`)
}
