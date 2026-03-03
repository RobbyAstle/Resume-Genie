import { NextRequest, NextResponse } from "next/server"
import { getSettings } from "./storage"
import { APIError as AnthropicAPIError } from "@anthropic-ai/sdk/core/error.js"

// ---------------------------------------------------------------------------
// Typed error class
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly message: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(message)
    this.name = "ApiError"
  }
}

// ---------------------------------------------------------------------------
// Standard error response shape
// ---------------------------------------------------------------------------

function errorResponse(
  message: string,
  code: string,
  status: number
): NextResponse {
  return NextResponse.json({ error: message, code, status }, { status })
}

// ---------------------------------------------------------------------------
// withErrorHandling wrapper
// ---------------------------------------------------------------------------

// Use unknown for ctx so handlers can narrow params to their specific key types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: NextRequest, ctx: any) => Promise<NextResponse>

export function withErrorHandling(handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx)
    } catch (err) {
      if (err instanceof ApiError) {
        return errorResponse(err.message, err.code, err.status)
      }

      // Anthropic SDK structured errors — check status code directly
      if (err instanceof AnthropicAPIError) {
        console.error("[Anthropic API Error]", err.status, err.message, err.error)
        if (err.status === 401) {
          return errorResponse("Invalid API key. Please check your key in Settings.", "AUTH_FAILURE", 401)
        }
        if (err.status === 429) {
          return errorResponse("AI provider rate limit reached. Please wait a moment and try again.", "RATE_LIMIT", 429)
        }
        if (err.status === 404) {
          return errorResponse("AI model not found. The selected model may not be available on your API plan.", "MODEL_NOT_FOUND", 404)
        }
        return errorResponse(err.message ?? "Anthropic API error.", "ANTHROPIC_ERROR", err.status ?? 500)
      }

      // Surface actionable AI provider errors (OpenAI and fallback)
      if (err instanceof Error) {
        const msg = err.message.toLowerCase()
        if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("invalid api key")) {
          return errorResponse(
            "Invalid API key. Please check your key in Settings.",
            "AUTH_FAILURE",
            401
          )
        }
        if (msg.includes("429") || msg.includes("rate limit")) {
          return errorResponse(
            "AI provider rate limit reached. Please wait a moment and try again.",
            "RATE_LIMIT",
            429
          )
        }
        if (msg.includes("exceed") || msg.includes("one page")) {
          return errorResponse(err.message, "PDF_OVERFLOW", 422)
        }
      }

      console.error("[API Error]", err)
      return errorResponse("An unexpected error occurred.", "INTERNAL_ERROR", 500)
    }
  }
}

// ---------------------------------------------------------------------------
// requireApiKeys guard
// ---------------------------------------------------------------------------

/**
 * Checks that at least one API key is configured for the selected provider.
 * Throws an ApiError (400) with a redirect hint if not.
 */
export async function requireApiKeys(): Promise<void> {
  const settings = await getSettings()
  const hasKey =
    (settings.provider === "openai" && !!settings.openaiKey) ||
    (settings.provider === "anthropic" && !!settings.anthropicKey)

  if (!hasKey) {
    throw new ApiError(
      "No API key configured. Please add your API key in Settings (/settings).",
      "MISSING_API_KEY",
      400
    )
  }
}
