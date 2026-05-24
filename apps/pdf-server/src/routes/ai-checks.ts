import type { FastifyInstance } from 'fastify'
import { desc, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { aiChecks, documents } from '../db/schema.js'
import type { AiCheckResult } from '../ai-check.js'

function serializeAiCheckSummary(row: typeof aiChecks.$inferSelect) {
  return {
    id: row.id,
    documentId: row.documentId,
    scope: row.scope,
    inputPreview: row.inputPreview,
    createdAt: row.createdAt,
  }
}

export async function registerAiCheckHistoryRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    '/api/documents/:id/ai-checks',
    async (request, reply) => {
      const [document] = db
        .select()
        .from(documents)
        .where(eq(documents.id, request.params.id))
        .limit(1)
        .all()

      if (!document) {
        return reply.status(404).send({ error: '文档不存在' })
      }

      const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 100)

      const rows = db
        .select()
        .from(aiChecks)
        .where(eq(aiChecks.documentId, request.params.id))
        .orderBy(desc(aiChecks.createdAt))
        .limit(limit)
        .all()

      return reply.send(rows.map(serializeAiCheckSummary))
    },
  )

  fastify.get<{ Params: { id: string } }>(
    '/api/ai-checks/:id',
    async (request, reply) => {
      const [row] = db
        .select()
        .from(aiChecks)
        .where(eq(aiChecks.id, request.params.id))
        .limit(1)
        .all()

      if (!row) {
        return reply.status(404).send({ error: '检查记录不存在' })
      }

      let result: AiCheckResult
      try {
        result = JSON.parse(row.resultJson) as AiCheckResult
      } catch {
        return reply.status(500).send({ error: '检查记录数据损坏' })
      }

      return reply.send({
        id: row.id,
        documentId: row.documentId,
        scope: row.scope,
        inputPreview: row.inputPreview,
        createdAt: row.createdAt,
        result,
      })
    },
  )

  fastify.delete<{ Params: { id: string } }>(
    '/api/ai-checks/:id',
    async (request, reply) => {
      const [row] = db
        .select()
        .from(aiChecks)
        .where(eq(aiChecks.id, request.params.id))
        .limit(1)
        .all()

      if (!row) {
        return reply.status(404).send({ error: '检查记录不存在' })
      }

      db.delete(aiChecks).where(eq(aiChecks.id, request.params.id)).run()
      return reply.status(204).send()
    },
  )
}

export function saveAiCheckHistory(
  documentId: string,
  scope: 'selection' | 'document',
  text: string,
  result: AiCheckResult,
): string | null {
  const [document] = db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1)
    .all()

  if (!document) {
    return null
  }

  const id = crypto.randomUUID()
  const preview = text.trim().slice(0, 200)

  db.insert(aiChecks)
    .values({
      id,
      documentId,
      scope,
      inputPreview: preview,
      resultJson: JSON.stringify(result),
      createdAt: Date.now(),
    })
    .run()

  return id
}
