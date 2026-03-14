import "server-only"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { type ZodTypeAny, type infer as ZodInfer } from "zod"
import { getSettings } from "./storage"
import { AI_TIMEOUT_MS, AI_RESUME_TIMEOUT_MS } from "./config"
import prompts from "@/prompts.json"

type PromptKey = keyof typeof prompts

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "")
}

// ---------------------------------------------------------------------------
// Overload signatures
// ---------------------------------------------------------------------------

export async function callAI(
  promptKey: PromptKey,
  vars: Record<string, string>,
  options?: { timeoutMs?: number }
): Promise<string>

export async function callAI<T extends ZodTypeAny>(
  promptKey: PromptKey,
  vars: Record<string, string>,
  options: { schema: T; timeoutMs?: number }
): Promise<ZodInfer<T>>

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export async function callAI<T extends ZodTypeAny>(
  promptKey: PromptKey,
  vars: Record<string, string>,
  options?: { schema?: T; timeoutMs?: number }
): Promise<string | ZodInfer<T>> {
  const settings = await getSettings()
  const prompt = prompts[promptKey]
  const userMessage = fillTemplate(prompt.user_template, vars)
  const timeoutMs = options?.timeoutMs ?? AI_TIMEOUT_MS
  const schema = options?.schema

  if (settings.provider === "anthropic" && settings.anthropicKey) {
    const client = new Anthropic({ apiKey: settings.anthropicKey || process.env.ANTHROPIC_API_KEY || "" })

    if (schema) {
      const outputFormat = zodOutputFormat(schema)
      const msg = await client.messages.parse(
        {
          model: "claude-sonnet-4-6",
          max_tokens: prompt.max_tokens,
          system: prompt.system,
          messages: [{ role: "user", content: userMessage }],
          output_config: { format: outputFormat },
        },
        { timeout: timeoutMs }
      )
      return msg.parsed_output as ZodInfer<T>
    }

    const msg = await client.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: prompt.max_tokens,
        system: prompt.system,
        messages: [{ role: "user", content: userMessage }],
      },
      { timeout: timeoutMs }
    )
    const block = msg.content[0]
    return block.type === "text" ? block.text : ""
  }

  // Default: OpenAI
  const apiKey = settings.openaiKey || process.env.OPENAI_API_KEY || ""
  const client = new OpenAI({ apiKey, timeout: timeoutMs })

  if (schema) {
    const schemaName = promptKey.replace(/_/g, "-")
    const response = await client.chat.completions.parse({
      model: "gpt-4o",
      max_completion_tokens: prompt.max_tokens,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: userMessage },
      ],
      response_format: zodResponseFormat(schema, schemaName),
    })
    const parsed = response.choices[0]?.message?.parsed
    if (!parsed) {
      throw new Error("OpenAI returned no parsed output")
    }
    return parsed as ZodInfer<T>
  }

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_completion_tokens: prompt.max_tokens,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: userMessage },
    ],
  })
  return response.choices[0]?.message?.content ?? ""
}

export function parseJSON<T>(text: string): T {
  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "")
  return JSON.parse(cleaned) as T
}

export { AI_TIMEOUT_MS, AI_RESUME_TIMEOUT_MS }
