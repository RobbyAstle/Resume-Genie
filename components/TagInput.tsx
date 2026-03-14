"use client"

import { useState } from "react"
import { X } from "lucide-react"

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagInput({ tags, onChange, placeholder }: TagInputProps) {
  const [input, setInput] = useState("")

  function addTag(value: string) {
    const trimmed = value.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInput("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag(input)
    } else if (e.key === "Backspace" && !input && tags.length) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 min-h-9 cursor-text"
      onClick={(e) => {
        const inp = (e.currentTarget as HTMLDivElement).querySelector("input")
        inp?.focus()
      }}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-sm bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-medium"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange(tags.filter((t) => t !== tag))
            }}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (input.trim()) addTag(input)
        }}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-24 outline-none bg-transparent text-sm placeholder:text-muted-foreground"
      />
    </div>
  )
}
