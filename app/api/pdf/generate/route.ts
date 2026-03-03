import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { DATA_DIR } from "@/lib/config"
import { updateSession } from "@/lib/storage"
import { renderTemplate } from "@/lib/template-engine"
import { generatePDF } from "@/lib/pdf-generator"
import { withErrorHandling, ApiError } from "@/lib/api-error"
import { getTemplateSchema } from "@/schemas/resume-content"
import type { ResumeContent } from "@/types"
import fs from "fs/promises"

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { templateId, content, sessionId, pageCount } = await req.json() as {
    templateId: string
    content: ResumeContent
    sessionId?: string
    pageCount?: number
  }

  console.log("[PDF Route] templateId:", templateId, "| sessionId:", sessionId, "| content keys:", content ? Object.keys(content) : null)

  if (!templateId || !content) {
    throw new ApiError("templateId and content are required", "VALIDATION_ERROR", 400)
  }

  // Validate content against the template's Zod schema before rendering
  const schema = getTemplateSchema(templateId)
  let validated: ReturnType<typeof schema.parse>
  try {
    validated = schema.parse(content)
    console.log("[PDF Route] Schema validation passed")
  } catch (e) {
    console.error("[PDF Route] Schema validation failed:", e)
    throw e
  }

  // Render HTML using the template engine (inlines CSS)
  const html = await renderTemplate(templateId, validated)
  console.log("[PDF Route] HTML rendered, length:", html.length)

  // Generate PDF via Puppeteer (throws if content overflows one page)
  const pdfBuffer = await generatePDF(html, pageCount ?? 1)
  console.log("[PDF Route] PDF generated, size:", pdfBuffer.byteLength)

  // Save PDF to disk
  const pdfDir = path.join(DATA_DIR, "pdfs")
  await fs.mkdir(pdfDir, { recursive: true })
  const filename = sessionId ? `${sessionId}.pdf` : `${Date.now()}.pdf`
  const outputPath = path.join(pdfDir, filename)
  await fs.writeFile(outputPath, pdfBuffer)

  if (sessionId) {
    await updateSession(sessionId, { pdfPath: outputPath })
  }

  return new NextResponse(Uint8Array.from(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="resume.pdf"`,
      "X-Download-Url": `/api/pdf/download/${filename}`,
    },
  })
})
