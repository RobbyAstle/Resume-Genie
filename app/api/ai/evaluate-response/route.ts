import { NextRequest, NextResponse } from "next/server"
import { callAI } from "@/lib/ai"
import { getSession, updateSession } from "@/lib/storage"
import { withErrorHandling, requireApiKeys, ApiError } from "@/lib/api-error"
import type { InterviewResponse } from "@/types"

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireApiKeys()

  const { question, response, jobDescription, sessionId, questionId } =
    await req.json() as {
      question: string
      response: string
      jobDescription: string
      sessionId?: string
      questionId?: string
    }

  if (!question || !response) {
    throw new ApiError("question and response are required", "VALIDATION_ERROR", 400)
  }

  const feedback = await callAI("response_evaluation", {
    question,
    response,
    job_description_brief: jobDescription?.slice(0, 500) ?? "",
  })

  if (sessionId && questionId) {
    const session = await getSession(sessionId)
    if (session) {
      const existing = session.interviewResponses.filter(
        (r) => r.questionId !== questionId
      )
      const updated: InterviewResponse = {
        questionId,
        response,
        feedback,
        submittedAt: new Date().toISOString(),
      }
      await updateSession(sessionId, {
        interviewResponses: [...existing, updated],
      })
    }
  }

  return NextResponse.json({ feedback })
})
