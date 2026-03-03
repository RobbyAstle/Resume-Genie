"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function NewSessionButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    setLoading(true)
    try {
      const res = await fetch("/api/sessions", { method: "POST", body: JSON.stringify({}), headers: { "Content-Type": "application/json" } })
      if (!res.ok) throw new Error("Failed to create session")
      const session = await res.json()
      router.push(`/session/${session.id}`)
    } catch {
      toast.error("Could not create session")
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleCreate} disabled={loading}>
      <Plus className="size-4" />
      {loading ? "Creating…" : "New Resume"}
    </Button>
  )
}
