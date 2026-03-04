"use client"

import { useEffect, useRef, useState } from "react"
import Handlebars from "handlebars"
import type { ResumeContent, TemplateId } from "@/types"

interface ResumePreviewProps {
  templateId: TemplateId
  content: ResumeContent
  onHeightChange?: (height: number) => void
}

export function ResumePreview({ templateId, content, onHeightChange }: ResumePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [contentH, setContentH] = useState(1056)

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        const [htmlRes, cssRes] = await Promise.all([
          fetch(`/templates/${templateId}/template.html`),
          fetch(`/templates/${templateId}/template.css`),
        ])
        if (!htmlRes.ok || !cssRes.ok) return
        const [htmlSrc, cssSrc] = await Promise.all([
          htmlRes.text(),
          cssRes.text(),
        ])
        if (cancelled) return

        const template = Handlebars.compile(htmlSrc)
        const rendered = template(content)
        const fullHtml = rendered.replace(
          '<link rel="stylesheet" href="template.css" />',
          `<style>${cssSrc}\nhtml, body { overflow: hidden !important; }</style>`
        )

        const iframe = iframeRef.current
        if (!iframe) return
        const doc = iframe.contentDocument
        if (!doc) return
        doc.open()
        doc.write(fullHtml)
        doc.close()

        // Wait for web fonts to load so the measurement reflects final layout
        await iframe.contentDocument?.fonts?.ready

        const measure = () => {
          if (cancelled) return
          // Reset iframe height so scrollHeight reflects actual content,
          // not the previous (possibly larger) iframe element height.
          iframe.style.height = "0px"
          const h = iframe.contentDocument?.documentElement.scrollHeight ?? 1056
          iframe.style.height = `${h}px`
          setContentH(h)
          if (onHeightChange) onHeightChange(h)
        }

        // Measure in the next frame, then re-measure after a short delay
        // to catch any late reflows from font/image loading
        requestAnimationFrame(measure)
        setTimeout(measure, 200)
      } catch {
        // Silently ignore render errors — user is still editing
      }
    }

    render()
    return () => {
      cancelled = true
    }
  }, [templateId, content, onHeightChange])

  // Letter page at 96 DPI = 816 × 1056 px.
  // Scale to fill 100% of the container width — no horizontal scroll.
  const pageW = 816
  const pageH = 1056
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scale = containerW > 0 ? containerW / pageW : 0.5
  const scaledH = pageH * scale
  const scaledContentH = contentH * scale

  return (
    <div
      ref={containerRef}
      className="overflow-y-scroll preview-scrollbar"
      style={{ height: scaledH }}
    >
      <div style={{ height: scaledContentH }}>
        <iframe
          ref={iframeRef}
          title="Resume Preview"
          sandbox="allow-same-origin"
          style={{
            display: "block",
            width: pageW,
            height: contentH,
            overflow: "hidden",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </div>
  )
}
