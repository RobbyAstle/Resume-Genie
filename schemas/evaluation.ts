import { z } from "zod"

export const StrengthSchema = z.object({
  title: z.string(),
  explanation: z.string(),
})

export const WeaknessSchema = z.object({
  gap: z.string(),
  suggestion: z.string(),
})

export const EvaluationResultSchema = z.object({
  strengths: z.array(StrengthSchema),
  weaknesses: z.array(WeaknessSchema),
  fitScore: z.number().min(0).max(100),
  overallAssessment: z.string(),
})

export const KeywordResultSchema = z.object({
  actionVerbs: z.array(z.string()),
  softSkills: z.array(z.string()),
  hardSkills: z.array(z.string()),
})

export type Strength = z.infer<typeof StrengthSchema>
export type Weakness = z.infer<typeof WeaknessSchema>
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>
export type KeywordResult = z.infer<typeof KeywordResultSchema>
