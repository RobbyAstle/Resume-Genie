"use client"

import { useRef, useState } from "react"
import { Loader2, SendHorizontal } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import type { InterviewQuestionItem, InterviewResponse } from "@/types"

const CATEGORY_COLORS: Record<string, string> = {
  Behavioral: "bg-blue-100 text-blue-800",
  Technical: "bg-purple-100 text-purple-800",
  Situational: "bg-amber-100 text-amber-800",
  Weakness: "bg-rose-100 text-rose-800",
}

interface InterviewQuestionProps {
  question: InterviewQuestionItem
  existingResponse?: InterviewResponse
  sessionId: string
  jobDescription: string
  number: number
}

export function InterviewQuestion({
  question,
  existingResponse,
  sessionId,
  jobDescription,
  number,
}: InterviewQuestionProps) {
  const [response, setResponse] = useState(existingResponse?.response ?? "")
  const [feedback, setFeedback] = useState(existingResponse?.feedback ?? "")
  const [evaluating, setEvaluating] = useState(false)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save on blur
  async function handleBlur() {
    if (!response.trim() || response === existingResponse?.response) return
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewResponses: [
            { questionId: question.id, response },
          ],
        }),
      })
    } catch {
      // Silent — not worth interrupting the user for a background save
    }
  }

  async function handleSubmit() {
    if (!response.trim()) {
      toast.error("Please write a response first")
      return
    }
    setEvaluating(true)
    try {
      const res = await fetch("/api/ai/evaluate-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.question,
          response,
          jobDescription,
          sessionId,
          questionId: question.id,
        }),
      })
      if (!res.ok) throw new Error("Evaluation failed")
      const data = await res.json()
      setFeedback(data.feedback)
    } catch {
      toast.error("Could not evaluate response")
    } finally {
      setEvaluating(false)
    }
  }

  const catClass =
    CATEGORY_COLORS[question.category] ??
    "bg-gray-100 text-gray-800"

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 mt-0.5 flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {number}
        </span>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${catClass}`}
            >
              {question.category}
            </span>
          </div>
          <p className="text-sm font-medium leading-relaxed">{question.question}</p>
        </div>
      </div>

      <div className="pl-9 space-y-3">
        <Textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          onBlur={handleBlur}
          placeholder="Write your response using the STAR method…"
          rows={4}
          className="text-sm"
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={evaluating || !response.trim()}
        >
          {evaluating ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Evaluating…
            </>
          ) : (
            <>
              <SendHorizontal className="size-3.5" />
              Submit Response
            </>
          )}
        </Button>

        {feedback && (
          <div className="rounded-md border bg-muted/30 p-4 text-sm whitespace-pre-wrap leading-relaxed">
            {feedback}
          </div>
        )}
      </div>
    </div>
  )
}
