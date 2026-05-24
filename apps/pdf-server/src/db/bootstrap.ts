import { count, desc, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { db } from './index.js'
import { documents, SETTING_KEYS, settings, type ThemeSetting } from './schema.js'

function getSetting(key: string): string | null {
  const rows = db.select().from(settings).where(eq(settings.key, key)).all()
  return rows[0]?.value ?? null
}

function setSetting(key: string, value: string): void {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value },
    })
    .run()
}

export function bootstrapDatabase(): void {
  const [{ value: documentCount }] = db.select({ value: count() }).from(documents).all()

  let defaultDocumentId: string | null = null
  const activeSetting = getSetting(SETTING_KEYS.activeDocumentId)
  if (activeSetting) {
    try {
      defaultDocumentId = JSON.parse(activeSetting) as string
    } catch {
      defaultDocumentId = null
    }
  }

  if (documentCount === 0) {
    const now = Date.now()
    defaultDocumentId = randomUUID()
    db.insert(documents)
      .values({
        id: defaultDocumentId,
        title: '未命名简历',
        content: '',
        createdAt: now,
        updatedAt: now,
      })
      .run()
  }

  if (!defaultDocumentId) {
    const [firstDocument] = db
      .select()
      .from(documents)
      .orderBy(desc(documents.updatedAt))
      .limit(1)
      .all()
    defaultDocumentId = firstDocument?.id ?? null
  }

  if (defaultDocumentId) {
    const [activeDocument] = db
      .select()
      .from(documents)
      .where(eq(documents.id, defaultDocumentId))
      .limit(1)
      .all()

    if (!activeDocument) {
      const [firstDocument] = db
        .select()
        .from(documents)
        .orderBy(desc(documents.updatedAt))
        .limit(1)
        .all()
      defaultDocumentId = firstDocument?.id ?? null
    }

    if (defaultDocumentId) {
      setSetting(SETTING_KEYS.activeDocumentId, JSON.stringify(defaultDocumentId))
    }
  }

  const theme = getSetting(SETTING_KEYS.theme)
  if (!theme) {
    setSetting(SETTING_KEYS.theme, JSON.stringify('system' satisfies ThemeSetting))
  }

  const accentColor = getSetting(SETTING_KEYS.accentColor)
  if (!accentColor) {
    setSetting(SETTING_KEYS.accentColor, JSON.stringify('purple'))
  }
}
