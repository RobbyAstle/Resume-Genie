import { NextRequest, NextResponse } from "next/server"
import { listProfiles, upsertProfile } from "@/lib/storage"
import { withErrorHandling } from "@/lib/api-error"
import type { CandidateProfile } from "@/types"

export const GET = withErrorHandling(async () => {
  const profiles = await listProfiles()
  return NextResponse.json(profiles)
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = (await req.json()) as CandidateProfile
  const saved = await upsertProfile(body)
  return NextResponse.json(saved, { status: 201 })
})

export const PUT = withErrorHandling(async (req: NextRequest) => {
  const body = (await req.json()) as CandidateProfile
  const saved = await upsertProfile(body)
  return NextResponse.json(saved)
})
