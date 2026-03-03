import { NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import { DATA_DIR } from "@/lib/config"
import { withErrorHandling, ApiError } from "@/lib/api-error"

export const GET = withErrorHandling(async (
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) => {
  const { filename } = await params

  // Sanitize: only allow alphanumeric, hyphens, underscores, and .pdf extension
  if (!/^[\w-]+\.pdf$/.test(filename)) {
    throw new ApiError("Invalid filename", "INVALID_FILENAME", 400)
  }

  const filePath = path.join(DATA_DIR, "pdfs", filename)

  let buffer: Buffer
  try {
    buffer = await fs.readFile(filePath)
  } catch {
    throw new ApiError("PDF not found", "NOT_FOUND", 404)
  }

  return new NextResponse(Uint8Array.from(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
})
