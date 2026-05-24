import cors from '@fastify/cors'
import Fastify from 'fastify'
import puppeteer from 'puppeteer'
import { AI_API_KEY_ENV_NAMES, getAiApiKey } from './ai-config.js'
import { runAiCheck } from './ai-check.js'
import { loadEnvFile } from './load-env.js'
import { runMigrations } from './db/migrate.js'
import { registerDocumentRoutes } from './routes/documents.js'
import { registerSettingsRoutes } from './routes/settings.js'
import {
  registerAiCheckHistoryRoutes,
  saveAiCheckHistory,
} from './routes/ai-checks.js'

loadEnvFile()

const PORT = Number(process.env.PDF_PORT) || 3001;
const MAX_AI_TEXT_LENGTH = 32 * 1024;

const CHROMIUM_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
].filter(Boolean) as string[];

async function launchBrowser() {
  for (const executablePath of CHROMIUM_CANDIDATES) {
    try {
      return await puppeteer.launch({
        headless: true,
        executablePath,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    } catch {
      // try next candidate
    }
  }

  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

async function main() {
  if (!getAiApiKey()) {
    console.error(`缺少 ${AI_API_KEY_ENV_NAMES}，后端无法启动`)
    console.error('请在项目根目录 .env 中配置，或通过环境变量传入')
    process.exit(1)
  }

  const fastify = Fastify({ bodyLimit: 2 * 1024 * 1024 });

  runMigrations();

  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (
        !origin ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        cb(null, true);
      } else {
        cb(new Error("Not allowed by CORS"), false);
      }
    },
  });

  fastify.post<{ Body: { html?: string; filename?: string } }>(
    "/api/export-pdf",
    async (request, reply) => {
      const { html, filename = "resume.pdf" } = request.body;

      if (!html || typeof html !== "string") {
        return reply.status(400).send({ error: "缺少 html 字段" });
      }

      let browser;
      try {
        browser = await launchBrowser();
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "load" });
        const pdf = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
        });

        return reply
          .header("Content-Type", "application/pdf")
          .header(
            "Content-Disposition",
            `attachment; filename="${encodeURIComponent(filename)}"`,
          )
          .send(Buffer.from(pdf));
      } catch (err) {
        console.error("PDF export error:", err);
        return reply.status(500).send({ error: "PDF 生成失败" });
      } finally {
        if (browser) {
          await browser.close();
        }
      }
    },
  );

  fastify.post<{
    Body: {
      text?: string
      scope?: 'selection' | 'document'
      documentId?: string
    }
  }>(
    "/api/ai-check",
    async (request, reply) => {
      const { text, scope = "document", documentId } = request.body;

      if (!text || typeof text !== "string" || !text.trim()) {
        return reply.status(400).send({ error: "缺少 text 字段" });
      }

      if (text.length > MAX_AI_TEXT_LENGTH) {
        return reply
          .status(400)
          .send({ error: `文本过长，上限 ${MAX_AI_TEXT_LENGTH} 字符` });
      }

      if (scope !== "selection" && scope !== "document") {
        return reply
          .status(400)
          .send({ error: "scope 必须为 selection 或 document" });
      }

      try {
        const result = await runAiCheck(text, scope);
        if (documentId && typeof documentId === "string") {
          saveAiCheckHistory(documentId, scope, text, result);
        }
        return reply.send(result);
      } catch (err) {
        console.error("AI check error:", err);
        return reply.status(502).send({ error: "AI 检查失败，请稍后重试" });
      }
    },
  );

  fastify.get("/api/health", async () => ({ ok: true }));

  await registerDocumentRoutes(fastify);
  await registerSettingsRoutes(fastify);
  await registerAiCheckHistoryRoutes(fastify);

  await fastify.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`API server listening on http://localhost:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
