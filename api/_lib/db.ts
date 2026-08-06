import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

/**
 * Neon connection string. The Vercel Neon integration provisions several env
 * vars; we accept any of them so the setup works whichever one is populated.
 */
export function connectionString(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.NEON_DATABASE_URL ||
    undefined
  )
}

let client: NeonQueryFunction<false, false> | null = null

/** Lazily create the Neon client. Throws a clear error if no URL is configured. */
export function db(): NeonQueryFunction<false, false> {
  if (client) return client
  const url = connectionString()
  if (!url) {
    throw new Error(
      'Neon database URL is not set. Add DATABASE_URL (or POSTGRES_URL) in your Vercel project.',
    )
  }
  client = neon(url)
  return client
}

let schemaReady = false

/** Idempotent schema bootstrap. Cheap enough to call per cold start. */
export async function ensureSchema(): Promise<void> {
  if (schemaReady) return
  const sql = db()
  await sql`
    create table if not exists store (
      path       text primary key,
      value      jsonb not null,
      updated_at timestamptz not null default now()
    )
  `
  await sql`
    create table if not exists documents (
      id           text primary key,
      project_id   text not null,
      name         text not null,
      url          text not null,
      size         bigint,
      content_type text,
      created_at   timestamptz not null default now()
    )
  `
  await sql`create index if not exists documents_project_idx on documents (project_id)`
  schemaReady = true
}
