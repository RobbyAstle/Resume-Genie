import { NextRequest, NextResponse } from "next/server"
import { getSettings, saveSettings } from "@/lib/storage"
import { withErrorHandling } from "@/lib/api-error"

function maskKey(key: string): string {
  if (!key || key.length < 8) return key ? "••••" : ""
  return "••••" + key.slice(-4)
}

export const GET = withErrorHandling(async () => {
  const settings = await getSettings()
  return NextResponse.json({
    provider: settings.provider,
    openaiKey: maskKey(settings.openaiKey),
    anthropicKey: maskKey(settings.anthropicKey),
  })
})

export const PUT = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}))
  // Only update keys if they are not masked placeholders
  const patch: Record<string, string> = {}
  if (body.provider) patch.provider = body.provider
  if (body.openaiKey && !body.openaiKey.startsWith("••••"))
    patch.openaiKey = body.openaiKey
  if (body.anthropicKey && !body.anthropicKey.startsWith("••••"))
    patch.anthropicKey = body.anthropicKey
  const updated = await saveSettings(patch)
  return NextResponse.json({
    provider: updated.provider,
    openaiKey: maskKey(updated.openaiKey),
    anthropicKey: maskKey(updated.anthropicKey),
  })
})
