// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export type TemplateId = "classic" | "modern" | "minimal" | "signature"

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export interface WorkExperience {
  id: string
  company: string
  title: string
  startDate: string
  endDate: string
  description: string
  achievements: string[]
}

export interface Education {
  id: string
  institution: string
  degree: string
  field: string
  startYear: string
  endYear: string
  gpa?: string
}

export interface CandidateProfile {
  id: string
  name: string
  // Personal info
  fullName: string
  email: string
  phone: string
  location: string
  website: string
  summary: string
  // Experience & education
  workExperience: WorkExperience[]
  education: Education[]
  // Skills
  technicalSkills: string[]
  softSkills: string[]
  certifications: string[]
  updatedAt: string
}

// ---------------------------------------------------------------------------
// AI Results
// ---------------------------------------------------------------------------

export interface KeywordResult {
  actionVerbs: string[]
  softSkills: string[]
  hardSkills: string[]
}

export interface Strength {
  title: string
  explanation: string
}

export interface Weakness {
  gap: string
  suggestion: string
}

export interface EvaluationResult {
  strengths: Strength[]
  weaknesses: Weakness[]
  overallAssessment: string
  fitScore: number
}

export interface InterviewQuestionItem {
  id: string
  question: string
  category: "Behavioral" | "Technical" | "Situational" | "Weakness"
}

export interface InterviewResponse {
  questionId: string
  response: string
  feedback?: string
  submittedAt?: string
}

// Resume content slots (matches template schema)
export interface ResumeExperienceEntry {
  company: string
  title: string
  dates: string
  bullets: string[]
  included: boolean
}

export interface ResumeEducationEntry {
  institution: string
  degree: string
  field: string
  year: string
  gpa?: string | null
}

export type ContactField = "email" | "phone" | "location" | "website"

export interface ResumeContent {
  name: string
  email: string
  phone: string
  location: string
  website: string
  summary: string
  experience: ResumeExperienceEntry[]
  education: ResumeEducationEntry[]
  skills: string[]
  hiddenFields?: ContactField[]
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export interface Session {
  id: string
  jobTitle: string
  company: string
  jobDescription: string
  profileId: string | null
  templateId: TemplateId | null
  pageCount: 1 | 2
  keywords: KeywordResult | null
  evaluation: EvaluationResult | null
  resumeContent: ResumeContent | null
  pdfPath: string | null
  interviewQuestions: InterviewQuestionItem[]
  interviewResponses: InterviewResponse[]
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export type AIProvider = "openai" | "anthropic"

export interface AppSettings {
  provider: AIProvider
  openaiKey: string
  anthropicKey: string
}
