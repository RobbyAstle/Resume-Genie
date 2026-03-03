/**
 * Generates 400×520px preview.png thumbnails for each resume template.
 * Run from the resume-genie directory:
 *   node scripts/generate-previews.mjs
 */

import puppeteer from 'puppeteer'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import Handlebars from 'handlebars'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// Sample data that fills every slot
const SAMPLE = {
  name: 'Alexandra Chen',
  email: 'alex.chen@email.com',
  phone: '(555) 012-3456',
  location: 'San Francisco, CA',
  summary:
    'Results-driven product manager with 6 years of experience leading cross-functional teams to deliver high-impact software products. Adept at translating complex user needs into actionable roadmaps and driving alignment across engineering, design, and business stakeholders.',
  experience: [
    {
      company: 'Acme Corp',
      title: 'Senior Product Manager',
      dates: 'Jan 2021 – Present',
      bullets: [
        'Led a team of 12 engineers and designers to ship a redesigned onboarding flow, increasing D7 retention by 34%.',
        'Defined and executed a 12-month product roadmap aligned to $4M ARR growth target.',
        'Implemented a data-driven prioritization framework adopted across 3 product lines.',
      ],
    },
    {
      company: 'Startup Inc',
      title: 'Product Manager',
      dates: 'Jun 2018 – Dec 2020',
      bullets: [
        'Launched mobile app from 0 to 50,000 MAU within first year of release.',
        'Conducted 80+ user interviews to inform feature prioritization and UX decisions.',
        'Collaborated with sales to build self-serve onboarding, cutting CAC by 22%.',
      ],
    },
  ],
  education: [
    {
      institution: 'Stanford University',
      degree: 'MBA',
      field: 'Technology & Entrepreneurship',
      year: '2018',
      gpa: '3.8',
    },
    {
      institution: 'UC Berkeley',
      degree: 'BS',
      field: 'Computer Science',
      year: '2015',
    },
  ],
  skills: [
    'Product Strategy',
    'Roadmap Planning',
    'SQL',
    'Figma',
    'A/B Testing',
    'Agile / Scrum',
    'Python',
    'Stakeholder Management',
  ],
}

const TEMPLATES = ['classic', 'modern', 'minimal']

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  for (const id of TEMPLATES) {
    const templateDir = path.join(ROOT, 'templates', id)
    const htmlPath = path.join(templateDir, 'template.html')
    const cssPath = path.join(templateDir, 'template.css')
    const outPath = path.join(templateDir, 'preview.png')

    const rawHtml = readFileSync(htmlPath, 'utf8')
    const css = readFileSync(cssPath, 'utf8')

    // Compile and render Handlebars template
    const tpl = Handlebars.compile(rawHtml)
    let html = tpl(SAMPLE)

    // Inline CSS (replace the <link> tag so no file:// resolution needed)
    html = html.replace(
      /<link[^>]+href="template\.css"[^>]*\/?>/,
      `<style>${css}</style>`
    )

    // Remove Google Fonts import (no network in headless for previews)
    html = html.replace(/@import url\([^)]+\);/g, '')

    const page = await browser.newPage()

    // Letter width at 96dpi = 816px; preview is 400px wide at ~47% scale
    const SCALE = 400 / 816
    await page.setViewport({ width: 816, height: 1056, deviceScaleFactor: 1 })
    await page.setContent(html, { waitUntil: 'domcontentloaded' })

    // Screenshot the full page then we'll trim to 400×520 equivalent
    const fullBuffer = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 816, height: 1056 },
    })

    await page.close()

    // Use a second headless page to resize to exactly 400×520
    const resizePage = await browser.newPage()
    await resizePage.setViewport({ width: 400, height: 520, deviceScaleFactor: 2 })
    await resizePage.setContent(`
      <!DOCTYPE html>
      <html><head><style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { width:400px; height:520px; overflow:hidden; background:#fff; }
        img { width:400px; height:auto; transform-origin:top left; }
      </style></head>
      <body>
        <img id="img" src="" />
        <script>
          const b64 = '${fullBuffer.toString('base64')}';
          document.getElementById('img').src = 'data:image/png;base64,' + b64;
        </script>
      </body></html>
    `, { waitUntil: 'domcontentloaded' })

    const previewBuffer = await resizePage.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 400, height: 520 },
    })

    await resizePage.close()

    writeFileSync(outPath, previewBuffer)
    console.log(`✓ ${id}/preview.png`)
  }

  await browser.close()
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
