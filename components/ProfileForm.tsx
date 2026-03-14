"use client"

import { useCallback, useRef, useState } from "react"
import { Plus, Trash2, Tag, Download, Upload, Check } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { TagInput } from "@/components/TagInput"
import { Checkbox } from "@/components/ui/checkbox"
import type { CandidateProfile, WorkExperience, Education } from "@/types"

function newWorkExperience(): WorkExperience {
  return {
    id: crypto.randomUUID(),
    company: "",
    title: "",
    startDate: "",
    endDate: "",
    description: "",
    achievements: [""],
  }
}

function newEducation(): Education {
  return {
    id: crypto.randomUUID(),
    institution: "",
    degree: "",
    field: "",
    startYear: "",
    endYear: "",
    gpa: "",
  }
}

function emptyProfile(): CandidateProfile {
  return {
    id: crypto.randomUUID(),
    name: "",
    fullName: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    summary: "",
    workExperience: [],
    education: [],
    technicalSkills: [],
    softSkills: [],
    certifications: [],
    updatedAt: new Date().toISOString(),
  }
}

// Format raw input into MM/YYYY — strips non-digits, auto-inserts slash
function formatDateInput(raw: string, prev: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 6)
  // If user is deleting the slash (e.g. "01/" → "01"), let them delete naturally
  if (prev.length > raw.length) {
    return digits.length > 2 ? digits.slice(0, 2) + "/" + digits.slice(2) : digits
  }
  if (digits.length <= 2) return digits
  return digits.slice(0, 2) + "/" + digits.slice(2)
}

// Validates MM/YYYY format with valid month (01-12)
const DATE_RE = /^(0[1-9]|1[0-2])\/\d{4}$/

function validateWorkEntry(w: WorkExperience): Record<string, boolean> {
  return {
    company: w.company.trim().length > 0,
    title: w.title.trim().length > 0,
    startDate: DATE_RE.test(w.startDate),
    endDate: w.endDate === "Present" || DATE_RE.test(w.endDate),
  }
}


interface ProfileFormProps {
  initial?: CandidateProfile
  profileId?: string
}

export function ProfileForm({ initial, profileId: initialProfileId }: ProfileFormProps) {
  const [profile, setProfile] = useState<CandidateProfile>(
    initial ?? emptyProfile()
  )
  const [currentProfileId, setCurrentProfileId] = useState(initialProfileId)
  const [dirty, setDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "fading">("idle")
  const [workErrors, setWorkErrors] = useState<Record<string, Record<string, boolean>>>({})
  const [saveError, setSaveError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Derived: are all work experience entries valid?
  const workValid = profile.workExperience.length === 0 ||
    profile.workExperience.every((w) => {
      const r = validateWorkEntry(w)
      return r.company && r.title && r.startDate && r.endDate
    })

  const save = useCallback(
    async (data: CandidateProfile) => {
      setSaveStatus("saving")
      try {
        const method = currentProfileId ? "PUT" : "POST"
        const res = await fetch("/api/profile", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error()
        const saved: CandidateProfile = await res.json()
        setProfile(saved)
        setCurrentProfileId(saved.id)
        setDirty(false)
        setSaveStatus("saved")
        setTimeout(() => {
          setSaveStatus("fading")
          setTimeout(() => setSaveStatus("idle"), 500)
        }, 1500)
      } catch {
        toast.error("Save failed", { id: "profile-save" })
        setSaveStatus("idle")
      }
    },
    [currentProfileId]
  )

  function update(patch: Partial<CandidateProfile>) {
    setProfile((prev) => {
      const next = { ...prev, ...patch }
      // Recompute work errors for real-time aria-invalid feedback
      const errs: Record<string, Record<string, boolean>> = {}
      for (const w of next.workExperience) {
        const result = validateWorkEntry(w)
        if (!result.company || !result.title || !result.startDate || !result.endDate) {
          errs[w.id] = result
        }
      }
      setWorkErrors(errs)
      // Clear save error once all fields are valid
      if (Object.keys(errs).length === 0) setSaveError("")
      return next
    })
    setDirty(true)
  }

  function handleSave() {
    if (!workValid) {
      setSaveError("Please fill in all required fields")
      return
    }
    setSaveError("")
    save(profile)
  }

  // Work experience helpers
  function updateWork(id: string, patch: Partial<WorkExperience>) {
    update({
      workExperience: profile.workExperience.map((w) =>
        w.id === id ? { ...w, ...patch } : w
      ),
    })
  }

  function addWork() {
    update({ workExperience: [...profile.workExperience, newWorkExperience()] })
  }

  function removeWork(id: string) {
    update({ workExperience: profile.workExperience.filter((w) => w.id !== id) })
  }

  // Education helpers
  function updateEdu(id: string, patch: Partial<Education>) {
    update({
      education: profile.education.map((e) =>
        e.id === id ? { ...e, ...patch } : e
      ),
    })
  }

  function addEdu() {
    update({ education: [...profile.education, newEducation()] })
  }

  function removeEdu(id: string) {
    update({ education: profile.education.filter((e) => e.id !== id) })
  }

  // Export
  function handleExport() {
    const blob = new Blob([JSON.stringify(profile, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `profile-${profile.fullName || "export"}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Import
  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string) as CandidateProfile
        setProfile(imported)
        await save(imported)
      } catch {
        toast.error("Invalid profile JSON")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const field = (
    key: keyof CandidateProfile,
    placeholder: string,
    multiline = false
  ) => {
    const value = (profile[key] as string) ?? ""
    const props = {
      value,
      placeholder,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ) => update({ [key]: e.target.value }),
    }
    return multiline ? (
      <Textarea {...props} rows={3} />
    ) : (
      <Input {...props} />
    )
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="size-3.5" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-3.5" />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Info</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full Name</label>
            {field("fullName", "Jane Smith")}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            {field("email", "jane@example.com")}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Phone</label>
            {field("phone", "+1 (555) 000-0000")}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Location</label>
            {field("location", "San Francisco, CA")}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Website</label>
            {field("website", "https://yoursite.com")}
          </div>
          <div className="col-span-full space-y-1.5">
            <label className="text-sm font-medium">Professional Summary</label>
            {field("summary", "A brief overview of your background…", true)}
          </div>
        </CardContent>
      </Card>

      {/* Work Experience */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Work Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.workExperience.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No experience added yet.
            </p>
          )}
          {profile.workExperience.map((w, idx) => (
            <div key={w.id}>
              {idx > 0 && <Separator className="mb-4" />}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Entry {idx + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeWork(w.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Company</label>
                    <Input
                      value={w.company}
                      placeholder="Acme Corp"
                      aria-invalid={workErrors[w.id]?.company === false}
                      onChange={(e) =>
                        updateWork(w.id, { company: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Title</label>
                    <Input
                      value={w.title}
                      placeholder="Software Engineer"
                      aria-invalid={workErrors[w.id]?.title === false}
                      onChange={(e) =>
                        updateWork(w.id, { title: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Start Date</label>
                    <Input
                      value={w.startDate}
                      placeholder="MM/YYYY"
                      maxLength={7}
                      aria-invalid={workErrors[w.id]?.startDate === false}
                      onChange={(e) =>
                        updateWork(w.id, {
                          startDate: formatDateInput(e.target.value, w.startDate),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">End Date</label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={w.endDate === "Present" ? "" : w.endDate}
                        placeholder="MM/YYYY"
                        maxLength={7}
                        disabled={w.endDate === "Present"}
                        aria-invalid={workErrors[w.id]?.endDate === false}
                        onChange={(e) =>
                          updateWork(w.id, {
                            endDate: formatDateInput(e.target.value, w.endDate),
                          })
                        }
                      />
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                        <Checkbox
                          checked={w.endDate === "Present"}
                          onCheckedChange={(checked) =>
                            updateWork(w.id, { endDate: checked ? "Present" : "" })
                          }
                        />
                        Present
                      </label>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Description</label>
                  <Textarea
                    value={w.description}
                    placeholder="Brief role description…"
                    rows={2}
                    onChange={(e) =>
                      updateWork(w.id, { description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">
                    Achievements (one per line)
                  </label>
                  <Textarea
                    value={w.achievements.join("\n")}
                    placeholder="Led team of 5 engineers…"
                    rows={3}
                    onChange={(e) =>
                      updateWork(w.id, {
                        achievements: e.target.value.split("\n"),
                      })
                    }
                  />
                </div>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addWork} className="w-full">
            <Plus className="size-3.5" />
            Add Experience
          </Button>
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Education</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.education.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No education added yet.
            </p>
          )}
          {profile.education.map((e, idx) => (
            <div key={e.id}>
              {idx > 0 && <Separator className="mb-4" />}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Entry {idx + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeEdu(e.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Institution</label>
                    <Input
                      value={e.institution}
                      placeholder="MIT"
                      onChange={(ev) =>
                        updateEdu(e.id, { institution: ev.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Degree</label>
                    <Input
                      value={e.degree}
                      placeholder="B.S."
                      onChange={(ev) =>
                        updateEdu(e.id, { degree: ev.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Field of Study</label>
                    <Input
                      value={e.field}
                      placeholder="Computer Science"
                      onChange={(ev) =>
                        updateEdu(e.id, { field: ev.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Graduation Year</label>
                    <Input
                      value={e.endYear}
                      placeholder="2020"
                      onChange={(ev) =>
                        updateEdu(e.id, { endYear: ev.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">GPA (optional)</label>
                    <Input
                      value={e.gpa ?? ""}
                      placeholder="3.9"
                      onChange={(ev) =>
                        updateEdu(e.id, { gpa: ev.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addEdu} className="w-full">
            <Plus className="size-3.5" />
            Add Education
          </Button>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Tag className="size-3.5" /> Technical Skills
            </label>
            <TagInput
              tags={profile.technicalSkills}
              onChange={(tags) => update({ technicalSkills: tags })}
              placeholder="Type a skill and press Enter…"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Tag className="size-3.5" /> Soft Skills
            </label>
            <TagInput
              tags={profile.softSkills}
              onChange={(tags) => update({ softSkills: tags })}
              placeholder="Leadership, communication…"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Certifications &amp; Achievements (one per line)
            </label>
            <Textarea
              value={profile.certifications.join("\n")}
              placeholder="AWS Certified Solutions Architect…"
              rows={3}
              onChange={(e) =>
                update({ certifications: e.target.value.split("\n") })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Floating save button */}
      {dirty || saveStatus !== "idle" ? (
        <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 transition-opacity duration-500 ${saveStatus === "fading" ? "opacity-0" : "opacity-100 animate-in fade-in slide-in-from-bottom-2 duration-200"}`}>
          {saveStatus === "saved" || saveStatus === "fading" ? (
            <span className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white shadow-lg">
              <Check className="size-4" />
              Saved
            </span>
          ) : (
            <Button
              className="px-8 shadow-lg"
              disabled={saveStatus === "saving"}
              onClick={handleSave}
            >
              {saveStatus === "saving" ? "Saving…" : "Save"}
            </Button>
          )}
          {saveError && (
            <p className="rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive shadow-lg">
              {saveError}
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
