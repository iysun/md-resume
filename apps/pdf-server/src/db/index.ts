import { DatabaseSync } from 'node:sqlite'
import { drizzle } from 'drizzle-orm/node-sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import * as schema from './schema.js'

function getDatabasePath(): string {
  const configured = process.env.DATABASE_PATH?.trim()
  if (configured) {
    return resolve(configured)
  }
  return resolve(process.cwd(), 'data', 'md-resume.db')
}

const databasePath = getDatabasePath()
mkdirSync(dirname(databasePath), { recursive: true })

const sqlite = new DatabaseSync(databasePath)
sqlite.exec('PRAGMA journal_mode = WAL')
sqlite.exec('PRAGMA foreign_keys = ON')

export const db = drizzle({ client: sqlite, schema })
export { databasePath, sqlite }
