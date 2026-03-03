import { z } from "zod"

export const SessionSchema = z.object({
  id: z.string(),
  jobTitle: z.string().default(""),
  company: z.string().default(""),
  jobDescription: z.string().default(""),
  profileId: z.string().nullable().default(null),
  templateId: z.string().nullable().default(null),
  pageCount: z.union([z.literal(1), z.literal(2)]).default(1),
  keywords: z
    .object({
      actionVerbs: z.array(z.string()),
      softSkills: z.array(z.string()),
      hardSkills: z.array(z.string()),
    })
    .nullable()
    .default(null),
  evaluation: z
    .object({
      strengths: z.array(
        z.object({ title: z.string(), explanation: z.string() })
      ),
      weaknesses: z.array(
        z.object({ title: z.string(), suggestion: z.string() })
      ),
      fitScore: z.number().min(0).max(100),
      assessment: z.string(),
    })
    .nullable()
    .default(null),
  resumeContent: z.record(z.string(), z.unknown()).nullable().default(null),
  pdfPath: z.string().nullable().default(null),
  interviewQuestions: z
    .array(
      z.object({
        id: z.string(),
        question: z.string(),
        category: z.string(),
      })
    )
    .default([]),
  interviewResponses: z
    .array(
      z.object({
        questionId: z.string(),
        response: z.string(),
        feedback: z.string().optional(),
        submittedAt: z.string().optional(),
      })
    )
    .default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Session = z.infer<typeof SessionSchema>
