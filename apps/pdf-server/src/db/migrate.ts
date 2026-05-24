import { migrate } from 'drizzle-orm/node-sqlite/migrator'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from './index.js'
import { bootstrapDatabase } from './bootstrap.js'

const currentDir = dirname(fileURLToPath(import.meta.url))

export function runMigrations(): void {
  const migrationsFolder = join(currentDir, '..', '..', 'drizzle')
  migrate(db, { migrationsFolder })
  bootstrapDatabase()
}
