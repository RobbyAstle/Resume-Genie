import { NextRequest, NextResponse } from "next/server"
import { getSession, updateSession, deleteSession } from "@/lib/storage"
import { withErrorHandling, ApiError } from "@/lib/api-error"

export const GET = withErrorHandling(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params
  const session = await getSession(id)
  if (!session) throw new ApiError("Session not found", "NOT_FOUND", 404)
  return NextResponse.json(session)
})

export const PUT = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const updated = await updateSession(id, body)
  if (!updated) throw new ApiError("Session not found", "NOT_FOUND", 404)
  return NextResponse.json(updated)
})

export const DELETE = withErrorHandling(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params
  const ok = await deleteSession(id)
  if (!ok) throw new ApiError("Session not found", "NOT_FOUND", 404)
  return NextResponse.json({ success: true })
})
