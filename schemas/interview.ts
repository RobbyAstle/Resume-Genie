import { z } from "zod"

export const InterviewQuestionSchema = z.object({
  id: z.string(),
  question: z.string().min(1),
  category: z.enum(["Behavioral", "Technical", "Situational", "Weakness"]),
})

export const InterviewResponseSchema = z.object({
  questionId: z.string(),
  response: z.string(),
  feedback: z.string().optional(),
  submittedAt: z.string().optional(),
})

export const InterviewQuestionsOutputSchema = z.object({
  questions: z.array(InterviewQuestionSchema),
})

export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>
export type InterviewResponse = z.infer<typeof InterviewResponseSchema>
export type InterviewQuestionsOutput = z.infer<typeof InterviewQuestionsOutputSchema>
