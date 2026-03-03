"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TemplateGallery } from "@/components/TemplateGallery"
import { ResumePreview } from "@/components/ResumePreview"
import { InterviewQuestion } from "@/components/InterviewQuestion"
import type {
  Session,
  CandidateProfile,
  KeywordResult,
  EvaluationResult,
  ResumeContent,
  ContactField,
  InterviewQuestionItem,
  TemplateId,
} from "@/types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SectionHeading({
  number,
  title,
  subtitle,
}: {
  number: number
  title: string
  subtitle?: string
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mt-0.5">
        {number}
      </span>
      <div>
        <h2 className="text-lg font-semibold leading-tight">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SessionBuilderProps {
  session: Session
  profiles: CandidateProfile[]
}

export function SessionBuilder({ session: initial, profiles }: SessionBuilderProps) {
  const router = useRouter()

  // Core state
  const [session, setSession] = useState<Session>(initial)
  const [jobDescription, setJobDescription] = useState(initial.jobDescription)
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    initial.profileId ?? profiles[0]?.id ?? ""
  )
  const [templateId, setTemplateId] = useState<TemplateId | null>(
    initial.templateId
  )

  // Analysis
  const [keywords, setKeywords] = useState<KeywordResult | null>(initial.keywords)
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(
    initial.evaluation
  )
  const [analyzing, setAnalyzing] = useState(false)

  // Resume
  const [resumeContent, setResumeContent] = useState<ResumeContent | null>(
    initial.resumeContent
  )
  const [generating, setGenerating] = useState(false)

  // PDF
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Page count & overflow detection
  const [pageCount, setPageCount] = useState<1 | 2>(
    (initial.pageCount as 1 | 2) ?? 1
  )
  const [previewHeight, setPreviewHeight] = useState(0)
  const previewOverflows = previewHeight > 0 && previewHeight > pageCount * 1056

  // Interview
  const [questions, setQuestions] = useState<InterviewQuestionItem[]>(
    initial.interviewQuestions ?? []
  )
  const [generatingQuestions, setGeneratingQuestions] = useState(false)

  const answeredCount = session.interviewResponses.filter((r) => r.response).length

  // ---------------------------------------------------------------------------
  // Persist helpers
  // ---------------------------------------------------------------------------

  async function patchSession(patch: Partial<Session>) {
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        const updated: Session = await res.json()
        setSession(updated)
      }
    } catch {
      // Silent — background save
    }
  }

  // Debounced job description save
  const jdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleJdChange(value: string) {
    setJobDescription(value)
    if (jdTimer.current) clearTimeout(jdTimer.current)
    jdTimer.current = setTimeout(
      () => patchSession({ jobDescription: value }),
      400
    )
  }

  function handleJdBlur() {
    patchSession({ jobDescription })
  }

  async function handleTemplateSelect(id: TemplateId) {
    setTemplateId(id)
    await patchSession({ templateId: id })
  }

  async function handlePageCountChange(count: 1 | 2) {
    setPageCount(count)
    await patchSession({ pageCount: count })
  }

  const handlePreviewHeight = useCallback((height: number) => {
    setPreviewHeight(height)
  }, [])

  // Re-evaluate overflow instantly when pageCount changes
  useEffect(() => {
    setPreviewHeight((h) => h)
  }, [pageCount])

  // ---------------------------------------------------------------------------
  // Section 1: Analyze
  // ---------------------------------------------------------------------------

  async function handleAnalyze() {
    if (!jobDescription.trim()) {
      toast.error("Paste a job description first")
      return
    }
    const profile = profiles.find((p) => p.id === selectedProfileId)
    if (!profile) {
      toast.error("Select a profile first")
      return
    }
    setAnalyzing(true)
    setKeywords(null)
    setEvaluation(null)
    try {
      const [kwRes, evalRes] = await Promise.all([
        fetch("/api/ai/extract-keywords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobDescription, sessionId: session.id }),
        }),
        fetch("/api/ai/evaluate-candidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobDescription,
            profile,
            sessionId: session.id,
          }),
        }),
      ])
      if (!kwRes.ok || !evalRes.ok) throw new Error("Analysis failed")
      const [kw, ev]: [KeywordResult, EvaluationResult] = await Promise.all([
        kwRes.json(),
        evalRes.json(),
      ])
      setKeywords(kw)
      setEvaluation(ev)
      await patchSession({ profileId: selectedProfileId })
    } catch {
      toast.error("Analysis failed — check your API key in Settings")
    } finally {
      setAnalyzing(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Section 2: Generate resume
  // ---------------------------------------------------------------------------

  async function handleGenerateResume() {
    const profile = profiles.find((p) => p.id === selectedProfileId)
    if (!profile) { toast.error("Select a profile first"); return }
    if (!templateId) { toast.error("Select a template first"); return }
    if (!jobDescription.trim()) { toast.error("Job description is empty"); return }

    setGenerating(true)
    try {
      const res = await fetch("/api/ai/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          profile,
          keywords,
          evaluation,
          templateSlots: ["name", "email", "phone", "location", "website", "summary", "experience", "education", "skills"],
          sessionId: session.id,
          pageCount,
        }),
      })
      if (!res.ok) throw new Error("Generation failed")
      const content: ResumeContent = await res.json()
      setResumeContent(content)
      setPdfUrl(null)
    } catch {
      toast.error("Resume generation failed — check your API key in Settings")
    } finally {
      setGenerating(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Section 2: Generate PDF
  // ---------------------------------------------------------------------------

  async function handleGeneratePdf() {
    if (!templateId || !resumeContent) return
    setGeneratingPdf(true)
    try {
      const res = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          content: visibleContent(resumeContent),
          sessionId: session.id,
          pageCount,
        }),
      })
      if (!res.ok) throw new Error("PDF generation failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
      toast.success("PDF ready — click Download")
    } catch {
      toast.error("PDF generation failed")
    } finally {
      setGeneratingPdf(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Section 3: Interview questions
  // ---------------------------------------------------------------------------

  async function handleGenerateQuestions() {
    if (!jobDescription.trim()) { toast.error("Job description is empty"); return }
    const profile = profiles.find((p) => p.id === selectedProfileId)
    setGeneratingQuestions(true)
    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          profile: { fullName: profile?.fullName ?? "", summary: profile?.summary ?? "" },
          evaluation,
          sessionId: session.id,
        }),
      })
      if (!res.ok) throw new Error()
      const data: { questions: InterviewQuestionItem[] } = await res.json()
      setQuestions(data.questions)
    } catch {
      toast.error("Could not generate questions — check your API key")
    } finally {
      setGeneratingQuestions(false)
    }
  }

  function handleExportQA() {
    const data = {
      questions: questions.map((q) => ({
        ...q,
        response: session.interviewResponses.find((r) => r.questionId === q.id),
      })),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `interview-qa-${session.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ---------------------------------------------------------------------------
  // Resume content editable fields
  // ---------------------------------------------------------------------------

  function updateResume(patch: Partial<ResumeContent>) {
    if (!resumeContent) return
    const updated = { ...resumeContent, ...patch }
    setResumeContent(updated)
  }

  /** Build a ResumeContent with excluded experience and hidden contact fields removed. */
  function visibleContent(rc: ResumeContent): ResumeContent {
    const hidden = rc.hiddenFields ?? []
    return {
      ...rc,
      email: hidden.includes("email") ? "" : rc.email,
      phone: hidden.includes("phone") ? "" : rc.phone,
      location: hidden.includes("location") ? "" : rc.location,
      website: hidden.includes("website") ? "" : rc.website,
      experience: rc.experience.filter((e) => e.included !== false),
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
          <ArrowLeft className="size-4" />
          <span className="sr-only">Return to Home</span>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">
            {session.jobTitle || "New Resume"}
          </h1>
          {session.company && (
            <p className="text-sm text-muted-foreground">{session.company}</p>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 1: Job Description & Analysis                               */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHeading
          number={1}
          title="Job Description & Candidate Evaluation"
          subtitle="Paste the job posting and analyze your fit."
        />

        <div className="space-y-4">
          {/* Job title & company */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Job Title</label>
              <Input
                value={session.jobTitle}
                placeholder="Software Engineer"
                onChange={(e) => patchSession({ jobTitle: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Company</label>
              <Input
                value={session.company}
                placeholder="Acme Corp"
                onChange={(e) => patchSession({ company: e.target.value })}
              />
            </div>
          </div>

          {/* Profile selector */}
          {profiles.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Candidate Profile</label>
              <Select
                value={selectedProfileId}
                onValueChange={setSelectedProfileId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select profile…" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.fullName || p.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Job description textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Job Description</label>
              <span className="text-xs text-muted-foreground">
                {jobDescription.length} chars
              </span>
            </div>
            <Textarea
              value={jobDescription}
              onChange={(e) => handleJdChange(e.target.value)}
              onBlur={handleJdBlur}
              placeholder="Paste the full job description here…"
              rows={8}
            />
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full sm:w-auto"
          >
            {analyzing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Analyze
              </>
            )}
          </Button>

          {/* Results */}
          {(analyzing || keywords || evaluation) && (
            <div className="grid gap-6 lg:grid-cols-2 mt-4">
              {/* Keywords */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Keywords</CardTitle>
                </CardHeader>
                <CardContent>
                  {analyzing && !keywords ? (
                    <SkeletonBlock lines={4} />
                  ) : keywords ? (
                    <div className="space-y-3">
                      {(
                        [
                          { label: "Action Verbs", items: keywords.actionVerbs, color: "bg-blue-100 text-blue-800" },
                          { label: "Soft Skills", items: keywords.softSkills, color: "bg-green-100 text-green-800" },
                          { label: "Hard Skills", items: keywords.hardSkills, color: "bg-purple-100 text-purple-800" },
                        ] as const
                      ).map(({ label, items, color }) => (
                        <div key={label}>
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                            {label}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {items.map((item) => (
                              <span
                                key={item}
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* Evaluation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Candidate Fit</CardTitle>
                </CardHeader>
                <CardContent>
                  {analyzing && !evaluation ? (
                    <SkeletonBlock lines={5} />
                  ) : evaluation ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Fit Score</span>
                        <Badge
                          variant={
                            evaluation.fitScore >= 70
                              ? "default"
                              : evaluation.fitScore >= 50
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {evaluation.fitScore}/100
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {evaluation.overallAssessment}
                      </p>
                      <div>
                        <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">
                          Strengths
                        </p>
                        <ul className="space-y-1">
                          {evaluation.strengths.map((s) => (
                            <li key={s.title} className="text-xs">
                              <span className="font-medium">{s.title}</span> —{" "}
                              {s.explanation}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">
                          Gaps
                        </p>
                        <ul className="space-y-1">
                          {evaluation.weaknesses.map((w) => (
                            <li key={w.gap} className="text-xs">
                              <span className="font-medium">{w.gap}</span> —{" "}
                              {w.suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      <Separator />

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: Generate Resume                                           */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHeading
          number={2}
          title="Generate Resume"
          subtitle="AI will tailor your resume content to the job description."
        />

        <div className="space-y-4">
          <TemplateGallery selected={templateId} onSelect={handleTemplateSelect} />

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Resume Length</p>
            <div className="flex gap-4">
              {([1, 2] as const).map((n) => (
                <label key={n} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="pageCount"
                    value={n}
                    checked={pageCount === n}
                    onChange={() => handlePageCountChange(n)}
                    className="accent-primary"
                  />
                  <span className="text-sm">{n} {n === 1 ? "page" : "pages"}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleGenerateResume}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  {resumeContent ? "Regenerate" : "Generate Resume"}
                </>
              )}
            </Button>
            {resumeContent && (
              <Button
                variant="outline"
                onClick={handleGeneratePdf}
                disabled={generatingPdf || !templateId || previewOverflows}
              >
                {generatingPdf ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating PDF…
                  </>
                ) : (
                  <>
                    <FileText className="size-4" />
                    Generate PDF
                  </>
                )}
              </Button>
            )}
            {pdfUrl && (
              <Button asChild variant="secondary">
                <a href={pdfUrl} download="resume.pdf">
                  <Download className="size-4" />
                  Download PDF
                </a>
              </Button>
            )}
          </div>

          {generating && !resumeContent && (
            <div className="space-y-3">
              <SkeletonBlock lines={6} />
            </div>
          )}

          {resumeContent && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Editable fields */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Edit Content</h3>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Name</label>
                    <Input
                      value={resumeContent.name}
                      onChange={(e) => updateResume({ name: e.target.value })}
                    />
                  </div>
                  {(["email", "phone", "location", "website"] as const).map((key) => {
                    const hidden = resumeContent.hiddenFields ?? []
                    const isIncluded = !hidden.includes(key)
                    return (
                      <div
                        key={key}
                        className={`space-y-1${!isIncluded ? " opacity-50" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium capitalize">{key}</label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isIncluded}
                              onChange={(e) => {
                                const next: ContactField[] = e.target.checked
                                  ? hidden.filter((f) => f !== key)
                                  : [...hidden, key]
                                updateResume({ hiddenFields: next })
                              }}
                              className="accent-primary"
                            />
                            <span className="text-xs text-muted-foreground">Include</span>
                          </label>
                        </div>
                        <Input
                          value={resumeContent[key]}
                          onChange={(e) => updateResume({ [key]: e.target.value })}
                        />
                      </div>
                    )
                  })}

                  <div className="space-y-1">
                    <label className="text-xs font-medium">Summary</label>
                    <Textarea
                      value={resumeContent.summary}
                      onChange={(e) => updateResume({ summary: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium">Skills (comma-separated)</label>
                    <Input
                      value={resumeContent.skills.join(", ")}
                      onChange={(e) =>
                        updateResume({
                          skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                    />
                  </div>

                  {resumeContent.experience.map((exp, idx) => (
                    <div
                      key={idx}
                      className={`rounded-md border p-3 space-y-2${exp.included === false ? " opacity-50 bg-muted/30" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Experience {idx + 1}
                        </p>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={exp.included !== false}
                            onChange={(e) => {
                              const updated = [...resumeContent.experience]
                              updated[idx] = { ...exp, included: e.target.checked }
                              updateResume({ experience: updated })
                            }}
                            className="accent-primary"
                          />
                          <span className="text-xs text-muted-foreground">Include</span>
                        </label>
                      </div>
                      <Input
                        value={exp.title}
                        placeholder="Title"
                        onChange={(e) => {
                          const updated = [...resumeContent.experience]
                          updated[idx] = { ...exp, title: e.target.value }
                          updateResume({ experience: updated })
                        }}
                      />
                      <Input
                        value={exp.company}
                        placeholder="Company"
                        onChange={(e) => {
                          const updated = [...resumeContent.experience]
                          updated[idx] = { ...exp, company: e.target.value }
                          updateResume({ experience: updated })
                        }}
                      />
                      <Input
                        value={exp.dates}
                        placeholder="Dates"
                        onChange={(e) => {
                          const updated = [...resumeContent.experience]
                          updated[idx] = { ...exp, dates: e.target.value }
                          updateResume({ experience: updated })
                        }}
                      />
                      <Textarea
                        value={exp.bullets.join("\n")}
                        rows={4}
                        placeholder="Bullet points (one per line)"
                        onChange={(e) => {
                          const updated = [...resumeContent.experience]
                          updated[idx] = { ...exp, bullets: e.target.value.split("\n") }
                          updateResume({ experience: updated })
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Live preview */}
              {templateId && (
                <div className="space-y-2 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto p-3">
                  <h3 className="text-sm font-semibold">Live Preview</h3>
                  <ResumePreview
                    templateId={templateId}
                    content={visibleContent(resumeContent)}
                    onHeightChange={handlePreviewHeight}
                  />
                  {previewOverflows && (
                    <p className="text-sm text-amber-600 flex items-center gap-1.5">
                      <AlertTriangle className="size-4 shrink-0" />
                      Preview exceeds {pageCount} {pageCount === 1 ? "page" : "pages"}. Trim content or switch to {pageCount === 1 ? "2 pages" : "fewer entries"} before generating a PDF.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <Separator />

      {/* ------------------------------------------------------------------ */}
      {/* Section 3: Interview Practice                                        */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHeading
          number={3}
          title="Interview Practice"
          subtitle={
            questions.length > 0
              ? `${answeredCount} of ${questions.length} questions answered`
              : "Generate questions tailored to this role and your profile."
          }
        />

        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleGenerateQuestions}
              disabled={generatingQuestions}
              variant={questions.length > 0 ? "outline" : "default"}
            >
              {generatingQuestions ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  {questions.length > 0 ? "Regenerate Questions" : "Generate Questions"}
                </>
              )}
            </Button>
            {questions.length > 0 && (
              <Button variant="outline" onClick={handleExportQA}>
                <Download className="size-4" />
                Export Q&A
              </Button>
            )}
          </div>

          {generatingQuestions && <SkeletonBlock lines={5} />}

          {questions.length > 0 && (
            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div key={q.id}>
                  {idx > 0 && <Separator className="mb-6" />}
                  <InterviewQuestion
                    question={q}
                    existingResponse={session.interviewResponses.find(
                      (r) => r.questionId === q.id
                    )}
                    sessionId={session.id}
                    jobDescription={jobDescription}
                    number={idx + 1}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
