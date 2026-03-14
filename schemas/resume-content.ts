import { z } from "zod"

// ---------------------------------------------------------------------------
// Shared sub-schemas
// ---------------------------------------------------------------------------

export const ResumeExperienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  dates: z.string(),
  bullets: z.array(z.string()).min(1).max(6),
  included: z.boolean().default(true),
})

export const ResumeEducationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string(),
  year: z.string(),
  gpa: z.string().nullable().optional(),
})

export const ResumeProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  included: z.boolean().default(true),
})

// ---------------------------------------------------------------------------
// Per-template content schemas
// All four templates share the same slot set.
// ---------------------------------------------------------------------------

const ContactFieldSchema = z.enum(["email", "phone", "location", "website"])

export const ResumeContentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string(),
  location: z.string().optional().default(""),
  website: z.string().optional().default(""),
  summary: z.string().min(20),
  experience: z.array(ResumeExperienceSchema),
  education: z.array(ResumeEducationSchema),
  projects: z.array(ResumeProjectSchema).optional().default([]),
  skills: z.array(z.string()),
  hiddenFields: z.array(ContactFieldSchema).optional().default([]),
})

// Template-specific aliases (all identical for now; extend if templates diverge)
export const ClassicResumeContentSchema = ResumeContentSchema
export const ModernResumeContentSchema = ResumeContentSchema
export const MinimalResumeContentSchema = ResumeContentSchema
export const SignatureResumeContentSchema = ResumeContentSchema

export type ResumeExperience = z.infer<typeof ResumeExperienceSchema>
export type ResumeEducation = z.infer<typeof ResumeEducationSchema>
export type ResumeProject = z.infer<typeof ResumeProjectSchema>
export type ResumeContent = z.infer<typeof ResumeContentSchema>

// ---------------------------------------------------------------------------
// Map from templateId → schema
// ---------------------------------------------------------------------------

export const TEMPLATE_SCHEMAS: Record<string, typeof ResumeContentSchema> = {
  classic: ClassicResumeContentSchema,
  modern: ModernResumeContentSchema,
  minimal: MinimalResumeContentSchema,
  signature: SignatureResumeContentSchema,
}

export function getTemplateSchema(templateId: string) {
  return TEMPLATE_SCHEMAS[templateId] ?? ResumeContentSchema
}
