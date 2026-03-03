import { listProfiles } from "@/lib/storage"
import { ProfileForm } from "@/components/ProfileForm"

export default async function ProfilePage() {
  const profiles = await listProfiles()
  const profile = profiles[0] // Use first profile for now

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
