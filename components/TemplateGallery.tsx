"use client"

import { CheckCircle2 } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { TemplateId } from "@/types"

interface TemplateInfo {
  id: TemplateId
  name: string
  description: string
  previewImage: string
}

const TEMPLATES: TemplateInfo[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Traditional serif layout, timeless and ATS-friendly",
    previewImage: "/templates/classic/preview.png",
  },
  {
    id: "modern",
    name: "Modern",
    description: "Two-tone layout with bold accent bar and skill tags",
    previewImage: "/templates/modern/preview.png",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Label-column layout with generous whitespace",
    previewImage: "/templates/minimal/preview.png",
  },
  {
    id: "signature",
    name: "Signature",
    description: "Refined layout — cream, copper, and editorial flair",
    previewImage: "/templates/signature/preview.png",
  },
]

interface TemplateGalleryProps {
  selected: TemplateId | null
  onSelect: (id: TemplateId) => void
}

export function TemplateGallery({ selected, onSelect }: TemplateGalleryProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {TEMPLATES.map((t) => {
        const isSelected = selected === t.id
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={cn(
              "relative flex flex-col rounded-lg border-2 overflow-hidden text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isSelected
                ? "border-primary shadow-md"
                : "border-border hover:border-primary/50 hover:shadow-sm"
            )}
          >
            {/* Preview image */}
            <div className="relative w-full aspect-[3/4] bg-muted overflow-hidden">
              <Image
                src={t.previewImage}
                alt={`${t.name} template preview`}
                fill
                className="object-cover object-top"
                sizes="(max-width: 640px) 50vw, 25vw"
              />
              {isSelected && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="size-8 text-primary drop-shadow" />
                </div>
              )}
            </div>
            {/* Label */}
            <div className="p-3">
              <p className="text-sm font-semibold">{t.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {t.description}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
