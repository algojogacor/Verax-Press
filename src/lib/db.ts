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
  const databaseUrl = sanitizeEnvValue(process.env.DATABASE_URL)
  const tursoUrl = sanitizeEnvValue(process.env.TURSO_DATABASE_URL)
  const tursoAuthToken = sanitizeEnvValue(process.env.TURSO_AUTH_TOKEN)
  const isProduction = process.env.NODE_ENV === 'production'
  const isTest =
    process.env.NODE_ENV === 'test' ||
    Boolean(databaseUrl && databaseUrl.toLowerCase().includes('test'))
  const allowTursoInDev = process.env.VERAX_CONNECT_TURSO === 'true'

  // 0. Test isolation safety: when running tests or test database is targeted,
  // strictly use local isolated test database and NEVER touch production or dev databases.
  if (isTest) {
    const testUrl =
      process.env.TEST_DATABASE_URL ||
      (databaseUrl && databaseUrl.toLowerCase().includes('test')
        ? databaseUrl
        : 'file:../db/isolated-test.db')
    return new PrismaClient({
      datasources: { db: { url: testUrl } },
      log: ['error'],
    })
  }

  // 1. Primary: Explicit Turso Cloud configuration (in production or when explicitly opted-in)
  if ((isProduction || allowTursoInDev) && tursoUrl) {
    if (!tursoAuthToken && isProduction) {
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
      log: isProduction ? ['error'] : ['query', 'error', 'warn'],
    })
  }

  // 2. Alternative: DATABASE_URL formatted as libsql:// or https:// (production or opt-in)
  if (
    (isProduction || allowTursoInDev) &&
    databaseUrl &&
    (databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('https://'))
  ) {
    if (!tursoAuthToken && isProduction) {
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
      log: isProduction ? ['error'] : ['query', 'error', 'warn'],
    })
  }

  // 3. Production validation: Fail closed if no remote database is configured in production
  if (isProduction) {
    throw new Error(
      'SECURITY FATAL: DATABASE_URL or TURSO_DATABASE_URL must be configured in production environment'
    )
  }

  // 4. Local development: Strictly use local SQLite database (db/custom.db).
  // Ensures local dev cannot accidentally mutate or write to Turso production.
  const localDevUrl =
    databaseUrl && !databaseUrl.startsWith('libsql://') && !databaseUrl.startsWith('https://')
      ? databaseUrl
      : 'file:../db/custom.db'

  return new PrismaClient({
    datasources: { db: { url: localDevUrl } },
    log: ['query', 'error', 'warn'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
