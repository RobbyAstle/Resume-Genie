import { NextRequest, NextResponse } from "next/server"
import { listSessions, createSession } from "@/lib/storage"
import { withErrorHandling } from "@/lib/api-error"

export const GET = withErrorHandling(async () => {
  const sessions = await listSessions()
  return NextResponse.json(sessions)
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}))
  const session = await createSession(body.jobTitle ?? "", body.company ?? "")
  return NextResponse.json(session, { status: 201 })
})
