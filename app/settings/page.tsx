"use client"

import { useEffect, useState } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { AIProvider } from "@/types"

interface SettingsState {
  provider: AIProvider
  openaiKey: string
  anthropicKey: string
}

function KeyInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Paste your API key…"}
          className="pr-10 font-mono text-sm"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => setShow((s) => !s)}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          <span className="sr-only">{show ? "Hide" : "Show"} key</span>
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    provider: "openai",
    openaiKey: "",
    anthropicKey: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: SettingsState) => setSettings(data))
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error("Save failed")
      const updated: SettingsState = await res.json()
      setSettings(updated)
      toast.success("Settings saved")
    } catch {
      toast.error("Could not save settings")
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    try {
      const res = await fetch("/api/settings/test")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Test failed")
      toast.success(`Connected to ${data.provider === "anthropic" ? "Anthropic" : "OpenAI"} successfully`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connection test failed")
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your AI provider and API keys. Keys are stored locally.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Provider</CardTitle>
          <CardDescription>Choose which AI model powers Resume Genie.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(
            [
              { value: "openai", label: "OpenAI" },
              { value: "anthropic", label: "Anthropic" },
            ] as { value: AIProvider; label: string }[]
          ).map(({ value, label }) => (
            <label key={value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="provider"
                value={value}
                checked={settings.provider === value}
                onChange={() =>
                  setSettings((s) => ({ ...s, provider: value }))
                }
                className="accent-primary"
              />
              <span className="text-sm font-medium">{label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Keys are masked after saving — only the last 4 characters are shown.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <KeyInput
            label="OpenAI API Key"
            value={settings.openaiKey}
            onChange={(v) => setSettings((s) => ({ ...s, openaiKey: v }))}
            placeholder="sk-…"
          />
          <Separator />
          <KeyInput
            label="Anthropic API Key"
            value={settings.anthropicKey}
            onChange={(v) => setSettings((s) => ({ ...s, anthropicKey: v }))}
            placeholder="sk-ant-…"
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
        <Button variant="outline" onClick={handleTest} disabled={testing}>
          {testing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Testing…
            </>
          ) : (
            "Test Connection"
          )}
        </Button>
      </div>
    </div>
  )
}
