"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, ChevronRight, Briefcase, Calendar } from "lucide-react"
import { toast } from "sonner"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import type { Session } from "@/types"

interface SessionCardProps {
  session: Session
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function SessionCard({ session }: SessionCardProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Session deleted")
      router.refresh()
    } catch {
      toast.error("Could not delete session")
    } finally {
      setDeleting(false)
      setConfirmOpen(false)
    }
  }

  const title = session.jobTitle || "Untitled Role"
  const company = session.company || "Unknown Company"

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="size-4 text-muted-foreground shrink-0" />
            {title}
          </CardTitle>
          <CardDescription>{company}</CardDescription>
          <CardAction>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfirmOpen(true)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Delete session</span>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3" />
            {formatDate(session.updatedAt)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/session/${session.id}`)}
          >
            Open
            <ChevronRight className="size-3" />
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete session?</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{title}&rdquo; at {company}.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
