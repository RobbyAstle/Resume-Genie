import puppeteer, { type Browser } from "puppeteer-core"
import { PDF_TIMEOUT_MS } from "./config"

// ---------------------------------------------------------------------------
// Locate Chrome/Chromium for puppeteer-core
// ---------------------------------------------------------------------------

function findChrome(): string {
  const platform = process.platform
  const candidates: string[] = []

  if (platform === "win32") {
    candidates.push(
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    )
  } else if (platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    )
  } else {
    candidates.push(
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("fs") as typeof import("fs")
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }

  throw new Error(
    "Could not find Chrome or Chromium. Set the PUPPETEER_EXECUTABLE_PATH " +
    "environment variable to the path of your Chrome/Chromium executable."
  )
}

// ---------------------------------------------------------------------------
// Browser singleton — reuse across requests for performance
// ---------------------------------------------------------------------------

let browserInstance: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance
  }
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || findChrome()
  browserInstance = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
  return browserInstance
}

// ---------------------------------------------------------------------------
// generatePDF
// ---------------------------------------------------------------------------

/**
 * Converts a self-contained HTML string to a PDF Buffer using Puppeteer.
 * Enforces letter-size single-page layout via CSS @page rules already present
 * in the template CSS.
 *
 * Throws if the rendered content overflows a single page.
 */
export async function generatePDF(html: string, maxPages = 1): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: PDF_TIMEOUT_MS,
    })

    await page.emulateMediaType("print")

    // Diagnostic: capture layout metrics before PDF generation
    const metrics = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      offsetHeight: document.documentElement.offsetHeight,
      bodyScrollHeight: document.body.scrollHeight,
      bodyOffsetHeight: document.body.offsetHeight,
      innerHeight: window.innerHeight,
    }))
    console.log("[PDF] Layout metrics (print media):", metrics)

    // For multi-page resumes, inject a spacer before the first content block
    // on page 2 so it doesn't start flush against the top margin.
    // The .page div's CSS padding only applies once at the top of the div,
    // so page-2 content would otherwise lack that internal spacing.
    if (maxPages > 1) {
      const spacerResult = await page.evaluate(() => {
        const pageDiv = document.querySelector(".page")
        if (!pageDiv) return "no .page div"

        // Puppeteer printable height per page:
        // 11in letter - 0.75in top - 0.75in bottom = 9.5in
        // At 96 DPI: 9.5 * 96 = 912px
        const BREAK_Y = 9.5 * 96

        // Check .entry elements first (finer granularity) — the page break
        // usually falls mid-section, so we want the spacer before the first
        // *entry* on page 2, not the next whole section.
        // Helper: insert a spacer that forces itself onto page 2.
        // We use break-before:page on the spacer so it (and everything
        // after it) moves to the next page. The spacer's height then
        // provides the visual breathing room at the top of page 2.
        function injectSpacer(before: Element, label: string) {
          const spacer = document.createElement("div")
          spacer.style.height = "0.75in"
          spacer.style.breakBefore = "page"
          before.before(spacer)
          return label
        }

        const entries = pageDiv.querySelectorAll<HTMLElement>(".entry")
        for (let i = 0; i < entries.length; i++) {
          const top = entries[i].getBoundingClientRect().top
          if (top >= BREAK_Y) {
            return injectSpacer(entries[i], `spacer before entry ${i} (top=${top.toFixed(1)})`)
          }
        }

        // Fallback: check top-level .section elements
        const sections = pageDiv.querySelectorAll<HTMLElement>(":scope > .section")
        for (let i = 0; i < sections.length; i++) {
          const top = sections[i].getBoundingClientRect().top
          if (top >= BREAK_Y) {
            return injectSpacer(sections[i], `spacer before section ${i} (top=${top.toFixed(1)})`)
          }
        }

        return "no element past break point"
      })
      console.log("[PDF] Spacer injection:", spacerResult)
    }

    const pdfBuffer = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0.75in", right: "0.75in", bottom: "0.75in", left: "0.75in" },
    })

    // Count PDF pages by scanning the raw buffer for page object markers.
    // The PDF spec guarantees each page has a "/Type /Page" entry (non-Pages).
    const pdfStr = Buffer.from(pdfBuffer).toString("latin1")
    const matches = pdfStr.match(/\/Type\s*\/Page[^s]/g) ?? []
    const pageCount = matches.length
    console.log("[PDF] Buffer size:", pdfBuffer.byteLength, "| Page marker matches:", matches, "| pageCount:", pageCount)

    if (pageCount > maxPages) {
      throw new Error(
        `Resume content exceeds ${maxPages} ${maxPages === 1 ? "page" : "pages"}. Please shorten your summary, reduce bullet points, or remove entries.`
      )
    }

    return Buffer.from(pdfBuffer)
  } finally {
    await page.close()
  }
}

// ---------------------------------------------------------------------------
// Cleanup — call on server shutdown if needed
// ---------------------------------------------------------------------------

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
  }
}
