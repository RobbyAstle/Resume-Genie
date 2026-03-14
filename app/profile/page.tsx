"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { ProfileForm } from "@/components/ProfileForm"
import type { CandidateProfile } from "@/types"

export default function ProfilePage() {
  const [profile, setProfile] = useState<CandidateProfile | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((profiles: CandidateProfile[]) => setProfile(profiles[0]))
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Candidate Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your profile is used by Resume Genie to tailor resumes and evaluate
          your fit. Changes auto-save on blur.
        </p>
      </div>

      <ProfileForm initial={profile} profileId={profile?.id} />
    </div>
  )
}
