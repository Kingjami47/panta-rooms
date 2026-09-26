import { PrismaClient } from '@prisma/client'
import { copyFileSync, existsSync } from 'node:fs'
import path from 'node:path'

/**
 * Storage bootstrap — local dev AND serverless production (e.g. Vercel).
 *
 * Local dev: DATABASE_URL in .env points at db/custom.db (schema seeded,
 * tracked in git so fresh clones work immediately). Nothing changes.
 *
 * Serverless (Vercel): the filesystem is read-only except /tmp, and the
 * machine-specific absolute path from local .env does not exist. When
 * DATABASE_URL is unset, we seed a WRITABLE copy of the bundled schema DB
 * into /tmp on cold start. The seed file is schema-only (no dev data), so
 * production starts with a clean social layer.
 *
 * Honesty note: /tmp storage is per-instance and ephemeral by nature —
 * rooms/comments survive while an instance is warm and reset on cold
 * starts. Demo Mode itself never depends on this storage for its feed
 * (sample cards are generated in src/server/panta/demo.ts).
 */
function resolveDatabaseUrl(): string {
  const explicit = process.env.DATABASE_URL
  if (explicit) return explicit

  const bundled = path.join(process.cwd(), 'db', 'custom.db')
  const target = '/tmp/panta-rooms.db'
  try {
    if (existsSync(bundled)) copyFileSync(bundled, target)
    // If the bundled seed is missing we still point at /tmp — ensureSchema()
    // below creates the three tables on the empty file Prisma will create.
  } catch {
    /* unreadable cwd (should not happen) — fall through to a fresh file */
  }
  return `file:${target}`
}

/**
 * Resolved ONCE and passed to PrismaClient as `datasourceUrl`.
 *
 * Why not just process.env.DATABASE_URL? Prisma's client re-loads .env files
 * (paths recorded at generate time) inside the constructor and can override
 * process.env back to a machine-specific absolute path that does not exist on
 * the deployment runtime. `datasourceUrl` takes precedence over every .env
 * source, so the serverless /tmp seeding below always wins when DATABASE_URL
 * is unset.
 */
const datasourceUrl = resolveDatabaseUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl,
    // Query logging is a dev convenience — production logs errors only.
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/** Idempotent DDL matching prisma/schema.prisma — no-op when tables exist. */
const SCHEMA_DDL = [
  `CREATE TABLE IF NOT EXISTS "Room" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "marketId" TEXT NOT NULL,
     "category" TEXT NOT NULL DEFAULT 'other',
     "title" TEXT NOT NULL,
     "description" TEXT,
     "imageUrl" TEXT,
     "creatorName" TEXT NOT NULL DEFAULT 'Anonymous',
     "creatorWallet" TEXT,
     "demo" BOOLEAN NOT NULL DEFAULT false,
     "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" DATETIME NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Room_marketId_key" ON "Room"("marketId")`,
  `CREATE TABLE IF NOT EXISTS "Comment" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "roomId" TEXT NOT NULL,
     "wallet" TEXT,
     "displayName" TEXT NOT NULL DEFAULT 'Guest',
     "body" TEXT NOT NULL,
     "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "Comment_roomId_fkey" FOREIGN KEY ("roomId")
       REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
   )`,
  `CREATE TABLE IF NOT EXISTS "Reaction" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "commentId" TEXT NOT NULL,
     "emoji" TEXT NOT NULL,
     "wallet" TEXT NOT NULL,
     CONSTRAINT "Reaction_commentId_fkey" FOREIGN KEY ("commentId")
       REFERENCES "Comment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Reaction_commentId_wallet_emoji_key"
     ON "Reaction"("commentId", "wallet", "emoji")`,
]

const globalForSchema = globalThis as unknown as {
  prismaSchemaReady: Promise<void> | undefined
}

/** Runs the idempotent schema DDL once per process. */
export function ensureSchema(): Promise<void> {
  globalForSchema.prismaSchemaReady ??= (async () => {
    for (const stmt of SCHEMA_DDL) {
      await db.$executeRawUnsafe(stmt)
    }
  })()
  return globalForSchema.prismaSchemaReady
}

// Top-level await: guarantees the schema exists before the first route
// handler query, even on a cold start where the bundled seed was absent.
try {
  await ensureSchema()
} catch (e) {
  console.error('[db] schema bootstrap failed:', e instanceof Error ? e.message : e)
}
