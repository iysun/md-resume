import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
})

export const aiChecks = sqliteTable('ai_checks', {
  id: text('id').primaryKey(),
  documentId: text('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  scope: text('scope', { enum: ['selection', 'document'] }).notNull(),
  inputPreview: text('input_preview').notNull(),
  resultJson: text('result_json').notNull(),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export type Document = typeof documents.$inferSelect
export type AiCheck = typeof aiChecks.$inferSelect
export type Setting = typeof settings.$inferSelect

export const SETTING_KEYS = {
  activeDocumentId: 'activeDocumentId',
  theme: 'theme',
} as const

export type ThemeSetting = 'system' | 'light' | 'dark'
