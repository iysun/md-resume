import type { FastifyInstance } from 'fastify'
import { desc, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { db } from '../db/index.js'
import { documents } from '../db/schema.js'
import {
  deriveTitleFromContent,
  getActiveDocumentId,
  setActiveDocumentId,
} from '../db/settings-store.js'

function serializeDocument(row: typeof documents.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    updatedAt: row.updatedAt,
  }
}

function serializeDocumentSummary(row: typeof documents.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    updatedAt: row.updatedAt,
  }
}

export async function registerDocumentRoutes(fastify: FastifyInstance) {
  fastify.get('/api/documents', async (_request, reply) => {
    const rows = db.select().from(documents).orderBy(desc(documents.updatedAt)).all()
    return reply.send(rows.map(serializeDocumentSummary))
  })

  fastify.post<{ Body: { title?: string; content?: string } }>(
    '/api/documents',
    async (request, reply) => {
      const now = Date.now()
      const content = request.body.content ?? ''
      const title =
        request.body.title?.trim() ||
        deriveTitleFromContent(content)

      const id = randomUUID()
      db.insert(documents)
        .values({
          id,
          title,
          content,
          createdAt: now,
          updatedAt: now,
        })
        .run()

      setActiveDocumentId(id)

      const [row] = db.select().from(documents).where(eq(documents.id, id)).limit(1).all()
      if (!row) {
        return reply.status(500).send({ error: '创建文档失败' })
      }
      return reply.status(201).send(serializeDocument(row))
    },
  )

  fastify.get<{ Params: { id: string } }>(
    '/api/documents/:id',
    async (request, reply) => {
      const [row] = db
        .select()
        .from(documents)
        .where(eq(documents.id, request.params.id))
        .limit(1)
        .all()

      if (!row) {
        return reply.status(404).send({ error: '文档不存在' })
      }

      return reply.send(serializeDocument(row))
    },
  )

  fastify.patch<{ Params: { id: string }; Body: { title?: string; content?: string } }>(
    '/api/documents/:id',
    async (request, reply) => {
      const [existing] = db
        .select()
        .from(documents)
        .where(eq(documents.id, request.params.id))
        .limit(1)
        .all()

      if (!existing) {
        return reply.status(404).send({ error: '文档不存在' })
      }

      const nextContent = request.body.content ?? existing.content
      const nextTitle =
        request.body.title?.trim() ||
        (request.body.content !== undefined
          ? deriveTitleFromContent(nextContent, existing.title)
          : existing.title)

      const now = Date.now()
      db.update(documents)
        .set({
          title: nextTitle,
          content: nextContent,
          updatedAt: now,
        })
        .where(eq(documents.id, request.params.id))
        .run()

      const [row] = db
        .select()
        .from(documents)
        .where(eq(documents.id, request.params.id))
        .limit(1)
        .all()

      return reply.send(serializeDocument(row!))
    },
  )

  fastify.delete<{ Params: { id: string } }>(
    '/api/documents/:id',
    async (request, reply) => {
      const [existing] = db
        .select()
        .from(documents)
        .where(eq(documents.id, request.params.id))
        .limit(1)
        .all()

      if (!existing) {
        return reply.status(404).send({ error: '文档不存在' })
      }

      const allDocuments = db.select().from(documents).all()
      if (allDocuments.length <= 1) {
        return reply.status(400).send({ error: '至少保留一份文档' })
      }

      db.delete(documents).where(eq(documents.id, request.params.id)).run()

      const activeDocumentId = getActiveDocumentId()
      if (activeDocumentId === request.params.id) {
        const [nextDocument] = db
          .select()
          .from(documents)
          .orderBy(desc(documents.updatedAt))
          .limit(1)
          .all()
        if (nextDocument) {
          setActiveDocumentId(nextDocument.id)
        }
      }

      return reply.status(204).send()
    },
  )
}
