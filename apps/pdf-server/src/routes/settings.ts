import type { FastifyInstance } from 'fastify'
import {
  getActiveDocumentId,
  getThemeSetting,
  setActiveDocumentId,
  setThemeSetting,
} from '../db/settings-store.js'
import type { ThemeSetting } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { documents } from '../db/schema.js'

const THEMES: ThemeSetting[] = ['system', 'light', 'dark']

function isTheme(value: unknown): value is ThemeSetting {
  return typeof value === 'string' && THEMES.includes(value as ThemeSetting)
}

export async function registerSettingsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/settings', async (_request, reply) => {
    return reply.send({
      activeDocumentId: getActiveDocumentId(),
      theme: getThemeSetting(),
    })
  })

  fastify.patch<{ Body: { activeDocumentId?: string; theme?: string } }>(
    '/api/settings',
    async (request, reply) => {
      const { activeDocumentId, theme } = request.body

      if (activeDocumentId !== undefined) {
        const [document] = db
          .select()
          .from(documents)
          .where(eq(documents.id, activeDocumentId))
          .limit(1)
          .all()

        if (!document) {
          return reply.status(404).send({ error: '文档不存在' })
        }

        setActiveDocumentId(activeDocumentId)
      }

      if (theme !== undefined) {
        if (!isTheme(theme)) {
          return reply.status(400).send({ error: 'theme 必须为 system、light 或 dark' })
        }
        setThemeSetting(theme)
      }

      return reply.send({
        activeDocumentId: getActiveDocumentId(),
        theme: getThemeSetting(),
      })
    },
  )
}
