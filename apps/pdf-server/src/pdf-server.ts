import cors from '@fastify/cors'
import Fastify from 'fastify'
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

async function main() {
  const fastify = Fastify({ bodyLimit: 2 * 1024 * 1024 })

  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        cb(null, true)
      } else {
        cb(new Error('Not allowed by CORS'), false)
      }
    },
  })

  fastify.post<{ Body: { html?: string; filename?: string } }>(
    '/api/export-pdf',
    async (request, reply) => {
      const { html, filename = 'resume.pdf' } = request.body

      if (!html || typeof html !== 'string') {
        return reply.status(400).send({ error: '缺少 html 字段' })
      }

      let browser
      try {
        browser = await launchBrowser()
        const page = await browser.newPage()
        await page.setContent(html, { waitUntil: 'load' })
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
        })

        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
          .send(Buffer.from(pdf))
      } catch (err) {
        console.error('PDF export error:', err)
        return reply.status(500).send({ error: 'PDF 生成失败' })
      } finally {
        if (browser) {
          await browser.close()
        }
      }
    },
  )

  fastify.get('/api/health', async () => ({ ok: true }))

  await fastify.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`PDF server listening on http://localhost:${PORT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
