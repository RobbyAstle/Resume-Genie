# Resume Genie

AI-powered resume builder and interview preparation tool. Runs entirely on your local machine — no cloud hosting, no accounts, no data leaves your computer.

## Quick Start (for end users)

1. Go to the [Releases](../../releases) page and download the ZIP for your platform:
   - **Windows:** `ResumeGenie-win32-x64.zip`
   - **Mac (Apple Silicon):** `ResumeGenie-darwin-arm64.zip`

2. Extract the ZIP to a folder of your choice.

3. Launch the app:
   - **Windows:** Double-click `start.bat`
   - **Mac:** Double-click `start.command` (you may need to right-click → Open the first time to bypass Gatekeeper)

4. Your browser will open to `http://localhost:3000`.

5. Go to **Settings** and enter your OpenAI or Anthropic API key. The key is encrypted and stored locally on your machine.

That's it — no installs, no prerequisites, no terminal commands.

## Developer Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (20 recommended)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

### Install & Run

```bash
cd resume-genie
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables (optional)

Copy `.env.example` to `.env.local` and edit as needed:

```bash
cp .env.example .env.local
```

Available variables:
- `DATA_DIR` — override the data storage path (defaults to `./data`)
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` — set API keys via env instead of the Settings UI
- `PUPPETEER_EXECUTABLE_PATH` — path to Chrome/Chromium for PDF generation (auto-detected if unset)

### Building a Standalone ZIP

To produce a distributable ZIP with bundled Node.js and Chromium:

```bash
# For your current platform
node scripts/build-standalone.mjs

# For a specific platform
node scripts/build-standalone.mjs --platform win32-x64
node scripts/build-standalone.mjs --platform darwin-arm64
```

The output is written to `dist/`.

### Project Structure

```
app/              → Next.js App Router pages & API routes
components/       → React components (SessionCard, ProfileForm, etc.)
lib/              → Server-side services (storage, AI, PDF, encryption)
schemas/          → Zod schemas for validation
templates/        → HTML/Handlebars resume templates
types/            → Shared TypeScript types
data/             → Runtime data (gitignored): sessions, profiles, PDFs, API keys
scripts/          → Build and utility scripts
```

### Useful Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm lint         # Run ESLint
pnpm exec tsc --noEmit   # Type-check without emitting
```
