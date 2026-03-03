import { NextRequest, NextResponse } from "next/server"
import { callAI } from "@/lib/ai"
import { updateSession } from "@/lib/storage"
import { withErrorHandling, requireApiKeys, ApiError } from "@/lib/api-error"
import { EvaluationResultSchema } from "@/schemas/evaluation"
import type { CandidateProfile } from "@/types"

function formatWorkExperience(profile: CandidateProfile): string {
  return profile.workExperience
    .map(
      (w) =>
        `${w.title} at ${w.company} (${w.startDate} – ${w.endDate})\n${w.description}\nAchievements: ${w.achievements.join(", ")}`
    )
    .join("\n\n")
}

function formatEducation(profile: CandidateProfile): string {
  return profile.education
    .map((e) => `${e.degree} in ${e.field} — ${e.institution} (${e.endYear})${e.gpa ? ` · GPA ${e.gpa}` : ""}`)
    .join("\n")
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireApiKeys()

  const { jobDescription, profile, sessionId } = await req.json() as {
    jobDescription: string
    profile: CandidateProfile
    sessionId?: string
  }

  if (!jobDescription || !profile) {
    throw new ApiError("jobDescription and profile are required", "VALIDATION_ERROR", 400)
  }

  const result = await callAI("candidate_evaluation", {
    job_description: jobDescription,
    name: profile.fullName,
    summary: profile.summary,
    work_experience: formatWorkExperience(profile),
    education: formatEducation(profile),
    skills: [...profile.technicalSkills, ...profile.softSkills].join(", "),
    certifications: (profile.certifications ?? []).join(", "),
  }, { schema: EvaluationResultSchema })

  if (sessionId) {
    await updateSession(sessionId, { evaluation: result })
  }

  return NextResponse.json(result)
})
