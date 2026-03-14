import "server-only"
import fs from "fs/promises"
import path from "path"
import Handlebars from "handlebars"
import { TEMPLATES_DIR } from "./config"
import type { ResumeContent } from "@/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TemplateSchema {
  slots: string[]
  name: string
}

export interface LoadedTemplate {
  html: string
  css: string
  schema: TemplateSchema
}

// ---------------------------------------------------------------------------
// Load raw template files
// ---------------------------------------------------------------------------

export async function loadTemplate(templateId: string): Promise<LoadedTemplate> {
  const dir = path.join(TEMPLATES_DIR, templateId)
  const [html, css, schemaRaw] = await Promise.all([
    fs.readFile(path.join(dir, "template.html"), "utf-8"),
    fs.readFile(path.join(dir, "template.css"), "utf-8"),
    fs.readFile(path.join(dir, "schema.json"), "utf-8"),
  ])
  const schema = JSON.parse(schemaRaw) as TemplateSchema
  return { html, css, schema }
}

// ---------------------------------------------------------------------------
// Render: fill Handlebars slots and inline CSS
// ---------------------------------------------------------------------------

/**
 * Renders a resume template with the given content.
 * Returns a complete self-contained HTML string (CSS inlined) ready for
 * browser rendering or Puppeteer PDF generation.
 */
export async function renderTemplate(
  templateId: string,
  content: ResumeContent
): Promise<string> {
  const { html, css } = await loadTemplate(templateId)
  const compiled = Handlebars.compile(html)
  const rendered = compiled(content)
  // Inline the stylesheet so the output is fully self-contained
  return rendered.replace(
    '<link rel="stylesheet" href="template.css" />',
    `<style>${css}</style>`
  )
}
