import { FileText } from "lucide-react"
import { listSessions } from "@/lib/storage"

export const dynamic = "force-dynamic"
import { SessionCard } from "@/components/SessionCard"
import { NewSessionButton } from "@/components/NewSessionButton"

export default async function HomePage() {
  const sessions = await listSessions()

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resumes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sessions.length > 0
              ? `${sessions.length} session${sessions.length === 1 ? "" : "s"} in progress`
              : "No sessions yet"}
          </p>
        </div>
        <NewSessionButton />
      </div>

      {/* Session grid */}
      {sessions.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FileText className="size-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No resumes yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Create your first resume to get started.
          </p>
          <NewSessionButton />
        </div>
      )}
    </div>
  )
}
