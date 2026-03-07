import { NextResponse } from "next/server"
import { getSettings } from "@/lib/storage"
import { withErrorHandling, ApiError } from "@/lib/api-error"
import OpenAI from "openai"
import Anthropic from "@anthropic-ai/sdk"

export const GET = withErrorHandling(async () => {
  const settings = await getSettings()

  if (settings.provider === "anthropic") {
    const anthropicKey = settings.anthropicKey || process.env.ANTHROPIC_API_KEY || ""
    if (!anthropicKey) {
      throw new ApiError("No Anthropic API key configured", "MISSING_API_KEY", 400)
    }
    const client = new Anthropic({ apiKey: anthropicKey })
    await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 10,
      messages: [{ role: "user", content: "Hi" }],
    })
  } else {
    const apiKey = settings.openaiKey || process.env.OPENAI_API_KEY || ""
    if (!apiKey) {
      throw new ApiError("No OpenAI API key configured", "MISSING_API_KEY", 400)
    }
    const client = new OpenAI({ apiKey })
    await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 5,
      messages: [{ role: "user", content: "Hi" }],
    })
  }

  return NextResponse.json({ success: true, provider: settings.provider })
})
