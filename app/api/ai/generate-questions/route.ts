import { NextRequest, NextResponse } from "next/server"
import { callAI } from "@/lib/ai"
import { updateSession } from "@/lib/storage"
import { withErrorHandling, requireApiKeys, ApiError } from "@/lib/api-error"
import { InterviewQuestionsOutputSchema } from "@/schemas/interview"
import type { EvaluationResult } from "@/types"

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireApiKeys()

  const { jobDescription, profile, evaluation, sessionId } =
    await req.json() as {
      jobDescription: string
      profile: { fullName: string; summary: string }
      evaluation: EvaluationResult
      sessionId?: string
    }

  if (!jobDescription) {
    throw new ApiError("jobDescription is required", "VALIDATION_ERROR", 400)
  }

  const strengths = (evaluation?.strengths ?? [])
    .map((s) => s.title)
    .join(", ")
  const weaknesses = (evaluation?.weaknesses ?? [])
    .map((w) => w.gap)
    .join(", ")

  const result = await callAI("interview_questions", {
    job_description: jobDescription,
    candidate_profile_summary: `${profile?.fullName ?? "Candidate"}: ${profile?.summary ?? ""}`,
    strengths,
    weaknesses,
  }, { schema: InterviewQuestionsOutputSchema })

  if (sessionId) {
    await updateSession(sessionId, { interviewQuestions: result.questions })
  }

  return NextResponse.json(result)
})
