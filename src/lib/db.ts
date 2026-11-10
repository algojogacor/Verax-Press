import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function sanitizeEnvValue(val?: string): string | undefined {
  if (!val) return undefined
  let s = val.trim()
  while (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim()
  }
  return s.length > 0 ? s : undefined
}

function createPrismaClient(): PrismaClient {
  const tursoUrl = sanitizeEnvValue(process.env.TURSO_DATABASE_URL)
  const tursoAuthToken = sanitizeEnvValue(process.env.TURSO_AUTH_TOKEN)
  const databaseUrl = sanitizeEnvValue(process.env.DATABASE_URL)

  // 1. Primary: Explicit Turso Cloud configuration
  if (tursoUrl) {
    if (!tursoAuthToken && process.env.NODE_ENV === 'production') {
      throw new Error(
        'SECURITY FATAL: TURSO_AUTH_TOKEN is required in production when TURSO_DATABASE_URL is set'
      )
    }

    const adapter = new PrismaLibSQL({
      url: tursoUrl,
      authToken: tursoAuthToken,
    })

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  }

  // 2. Alternative: DATABASE_URL formatted as libsql:// or https://
  if (databaseUrl && (databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('https://'))) {
    if (!tursoAuthToken && process.env.NODE_ENV === 'production') {
      throw new Error(
        'SECURITY FATAL: TURSO_AUTH_TOKEN is required for remote libsql connection in production'
      )
    }

    const adapter = new PrismaLibSQL({
      url: databaseUrl,
      authToken: tursoAuthToken,
    })

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  }

  // 3. Production validation: Fail closed if no database connection is configured
  if (process.env.NODE_ENV === 'production') {
    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL or TURSO_DATABASE_URL must be configured in production environment'
      )
    }
  }

  // 4. Local development / test fallback: Native SQLite file connector
  return new PrismaClient({
    log: ['query', 'error', 'warn'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
