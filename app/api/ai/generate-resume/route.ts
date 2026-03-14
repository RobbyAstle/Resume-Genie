import { NextRequest, NextResponse } from "next/server"
import { callAI, AI_RESUME_TIMEOUT_MS } from "@/lib/ai"
import { updateSession } from "@/lib/storage"
import { withErrorHandling, requireApiKeys, ApiError } from "@/lib/api-error"
import { getTemplateSchema } from "@/schemas/resume-content"
import type { KeywordResult, EvaluationResult, CandidateProfile, ResumeContent } from "@/types"

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireApiKeys()

  const { jobDescription, profile, keywords, evaluation, templateSlots, templateId, sessionId, pageCount } =
    await req.json() as {
      jobDescription: string
      profile: CandidateProfile
      keywords: KeywordResult
      evaluation: EvaluationResult
      templateSlots: string[]
      templateId?: string
      sessionId?: string
      pageCount?: number
    }

  if (!jobDescription || !profile) {
    throw new ApiError("jobDescription and profile are required", "VALIDATION_ERROR", 400)
  }

  const strengths = (evaluation?.strengths ?? [])
    .map((s) => `${s.title}: ${s.explanation}`)
    .join("; ")

  const weaknesses = (evaluation?.weaknesses ?? [])
    .map((w) => `${w.gap}: ${w.suggestion}`)
    .join("; ")

  const profileStr = JSON.stringify({
    name: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    website: profile.website,
    summary: profile.summary,
    workExperience: profile.workExperience,
    education: profile.education,
    technicalSkills: profile.technicalSkills,
    softSkills: profile.softSkills,
    certifications: profile.certifications,
  })

  const schema = getTemplateSchema(templateId ?? "classic")

  const result: ResumeContent = await callAI(
    "resume_tailoring",
    {
      job_description: jobDescription,
      action_verbs: (keywords?.actionVerbs ?? []).join(", "),
      soft_skills: (keywords?.softSkills ?? []).join(", "),
      hard_skills: (keywords?.hardSkills ?? []).join(", "),
      candidate_profile: profileStr,
      strengths,
      weaknesses,
      template_slots: JSON.stringify(
        templateSlots ?? ["name", "email", "phone", "location", "website", "summary", "experience", "education", "projects", "skills"]
      ),
      page_count: String(pageCount ?? 1),
    },
    { schema, timeoutMs: AI_RESUME_TIMEOUT_MS }
  )

  // Sort experience in reverse chronological order (most recent first).
  // The dates field is e.g. "Jan 2020 - Jun 2023" or "Mar 2021 - Present".
  // Parse the start date from the left side for sorting.
  result.experience.sort((a, b) => {
    const parseStart = (dates: string) => {
      const part = dates.split(/\s*[-–—]\s*/)[0]?.trim()
      const t = Date.parse(part)
      return Number.isNaN(t) ? 0 : t
    }
    return parseStart(b.dates) - parseStart(a.dates)
  })

  if (sessionId) {
    await updateSession(sessionId, { resumeContent: result })
  }

  return NextResponse.json(result)
})
