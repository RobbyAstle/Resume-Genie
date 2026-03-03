import { NextRequest, NextResponse } from "next/server"
import { callAI } from "@/lib/ai"
import { updateSession } from "@/lib/storage"
import { withErrorHandling, requireApiKeys, ApiError } from "@/lib/api-error"
import { KeywordResultSchema } from "@/schemas/evaluation"

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireApiKeys()

  const { jobDescription, sessionId } = await req.json()

  if (!jobDescription) {
    throw new ApiError("jobDescription is required", "VALIDATION_ERROR", 400)
  }

  const result = await callAI("keyword_extraction", {
    job_description: jobDescription,
  }, { schema: KeywordResultSchema })

  if (sessionId) {
    await updateSession(sessionId, { keywords: result })
  }

  return NextResponse.json(result)
})
