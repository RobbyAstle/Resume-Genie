import { z } from "zod"

export const WorkExperienceSchema = z.object({
  id: z.string(),
  company: z.string().min(1, "Company is required"),
  title: z.string().min(1, "Job title is required"),
  startDate: z.string(),
  endDate: z.string().nullable(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  achievements: z.array(z.string()).default([]),
})

export const EducationSchema = z.object({
  id: z.string(),
  institution: z.string().min(1, "Institution is required"),
  degree: z.string().min(1, "Degree is required"),
  field: z.string(),
  startYear: z.string(),
  endYear: z.string(),
  gpa: z.string().optional(),
})

export const CandidateProfileSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Must be a valid email"),
  phone: z.string(),
  location: z.string().optional(),
  website: z.string().url("Must be a valid URL").optional().default(""),
  summary: z.string().min(10, "Summary must be at least 10 characters"),
  workExperience: z.array(WorkExperienceSchema).default([]),
  education: z.array(EducationSchema).default([]),
  technicalSkills: z.array(z.string()).default([]),
  softSkills: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type WorkExperience = z.infer<typeof WorkExperienceSchema>
export type Education = z.infer<typeof EducationSchema>
export type CandidateProfile = z.infer<typeof CandidateProfileSchema>
