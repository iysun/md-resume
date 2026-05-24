import express from 'express'
import cors from 'cors'
import puppeteer from 'puppeteer'

const PORT = Number(process.env.PDF_PORT) || 3001

const CHROMIUM_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
].filter(Boolean) as string[]

async function launchBrowser() {
  for (const executablePath of CHROMIUM_CANDIDATES) {
    try {
      return await puppeteer.launch({
        headless: true,
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
    } catch {
      // try next candidate
    }
  }

  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
}

const app = express()

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
}))
app.use(express.json({ limit: '2mb' }))

app.post('/api/export-pdf', async (req, res) => {
  const { html, filename = 'resume.pdf' } = req.body as { html?: string; filename?: string }

  if (!html || typeof html !== 'string') {
    res.status(400).json({ error: '缺少 html 字段' })
    return
  }

  let browser
  try {
    browser = await launchBrowser()
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    res.send(Buffer.from(pdf))
  } catch (err) {
    console.error('PDF export error:', err)
    res.status(500).json({ error: 'PDF 生成失败' })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`PDF server listening on http://localhost:${PORT}`)
})
