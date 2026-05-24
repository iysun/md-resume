import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { SETTING_KEYS, settings, type ThemeSetting, type AccentColor } from '../db/schema.js'

function parseJsonSetting<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function readSetting(key: string): string | null {
  const rows = db.select().from(settings).where(eq(settings.key, key)).all()
  return rows[0]?.value ?? null
}

export function writeSetting(key: string, value: string): void {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value },
    })
    .run()
}

export function getActiveDocumentId(): string | null {
  return parseJsonSetting(readSetting(SETTING_KEYS.activeDocumentId), null)
}

export function setActiveDocumentId(documentId: string): void {
  writeSetting(SETTING_KEYS.activeDocumentId, JSON.stringify(documentId))
}

export function getThemeSetting(): ThemeSetting {
  return parseJsonSetting(readSetting(SETTING_KEYS.theme), 'system')
}

export function setThemeSetting(theme: ThemeSetting): void {
  writeSetting(SETTING_KEYS.theme, JSON.stringify(theme))
}

export function getAccentColorSetting(): AccentColor {
  return parseJsonSetting(readSetting(SETTING_KEYS.accentColor), 'purple')
}

export function setAccentColorSetting(accentColor: AccentColor): void {
  writeSetting(SETTING_KEYS.accentColor, JSON.stringify(accentColor))
}

export function deriveTitleFromContent(content: string, fallback = '未命名简历'): string {
  const match = content.match(/^#\s+(.+)$/m)
  if (!match?.[1]) return fallback
  const title = match[1].trim()
  return title || fallback
}
