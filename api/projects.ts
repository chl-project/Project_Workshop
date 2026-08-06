import { randomUUID } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db, ensureSchema } from './_lib/db.js'
import { allowCors, authorized } from './_lib/http.js'

/**
 * Project registry and lifecycle.
 *
 * The list itself lives in the `store` row at `/projects`, the same shape the
 * screens already read, so creating a project needs no separate table. A
 * project's own data lives under `/projects/<id>/…` in that table, plus rows in
 * `knowledge_docs` / `knowledge_chunks` / `documents` keyed by project id —
 * delete and duplicate walk all four.
 *
 *   GET    /api/projects                        -> { projects, activeId }
 *   POST   /api/projects  {name, units, area, location}
 *                                               -> create (empty)
 *   POST   /api/projects?action=duplicate&id=…  -> copy a project with its data
 *   PATCH  /api/projects?id=…                   -> rename / edit details
 *   DELETE /api/projects?id=…                   -> remove it and all its data
 */
export const config = { maxDuration: 60 }

interface Project {
  id: string
  name: string
  meta: string
  units?: string
  area?: string
  location?: string
  /** Absent on the bundled samples; set on anything created here. */
  createdAt?: string
}

interface Registry {
  projects: Project[]
  activeId: string
}

const PROJECTS_PATH = '/projects'

/** Builds the one-line summary shown under a project's name. */
function metaFrom(p: { units?: string; area?: string; location?: string }): string {
  return [p.units, p.area, p.location].map((v) => (v ?? '').trim()).filter(Boolean).join(' · ')
}

/** Turns a name into a readable, unique id. */
function slugFrom(name: string, taken: Set<string>): string {
  const base =
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'proyek'
  if (!taken.has(base)) return base
  for (let n = 2; n < 500; n++) {
    const candidate = `${base}-${n}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base}-${randomUUID().slice(0, 6)}`
}

async function readRegistry(): Promise<Registry> {
  const sql = db()
  const rows = await sql`select value from store where path = ${PROJECTS_PATH}`
  const value = rows[0]?.value as Registry | undefined
  if (!value || !Array.isArray(value.projects)) return { projects: [], activeId: '' }
  return { projects: value.projects, activeId: value.activeId ?? value.projects[0]?.id ?? '' }
}

async function writeRegistry(registry: Registry): Promise<void> {
  const sql = db()
  const json = JSON.stringify(registry)
  await sql`
    insert into store (path, value) values (${PROJECTS_PATH}, ${json}::jsonb)
    on conflict (path) do update set value = excluded.value, updated_at = now()
  `
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    await ensureSchema()
    const sql = db()

    if (req.method === 'GET') {
      return res.status(200).json(await readRegistry())
    }

    if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' })

    /* ---- create, or duplicate an existing project ------------------------ */
    if (req.method === 'POST') {
      const registry = await readRegistry()
      const taken = new Set(registry.projects.map((p) => p.id))

      if (req.query.action === 'duplicate') {
        const sourceId = String(req.query.id ?? '')
        const source = registry.projects.find((p) => p.id === sourceId)
        if (!source) return res.status(404).json({ error: 'proyek sumber tidak ditemukan' })

        const body = (req.body ?? {}) as { name?: string }
        const name = (body.name ?? `${source.name} (salinan)`).trim()
        const id = slugFrom(name, taken)

        // Copy the project's own endpoint rows, rewriting the id in each path.
        await sql`
          insert into store (path, value)
          select replace(path, ${'/projects/' + sourceId + '/'}, ${'/projects/' + id + '/'}), value
            from store
           where path like ${'/projects/' + sourceId + '/%'}
          on conflict (path) do update set value = excluded.value, updated_at = now()
        `
        // Copy the knowledge base, keeping each chunk attached to its new doc.
        const docs = (await sql`
          select id, title, source, chars, chunks from knowledge_docs where project_id = ${sourceId}
        `) as { id: string; title: string; source: string | null; chars: number; chunks: number }[]
        for (const doc of docs) {
          const newDocId = randomUUID()
          await sql`
            insert into knowledge_docs (id, project_id, title, source, chars, chunks)
            values (${newDocId}, ${id}, ${doc.title}, ${doc.source}, ${doc.chars}, ${doc.chunks})
          `
          await sql`
            insert into knowledge_chunks (id, doc_id, project_id, idx, content, embedding)
            select gen_random_uuid()::text, ${newDocId}, ${id}, idx, content, embedding
              from knowledge_chunks where doc_id = ${doc.id}
          `
        }

        const project: Project = {
          ...source,
          id,
          name,
          createdAt: new Date().toISOString(),
        }
        registry.projects = [...registry.projects, project]
        registry.activeId = id
        await writeRegistry(registry)
        return res.status(201).json({ project, registry })
      }

      const body = (req.body ?? {}) as {
        name?: string
        units?: string
        area?: string
        location?: string
      }
      const name = (body.name ?? '').trim()
      if (!name) return res.status(400).json({ error: 'nama proyek wajib diisi' })

      const id = slugFrom(name, taken)
      const project: Project = {
        id,
        name,
        units: body.units?.trim() || undefined,
        area: body.area?.trim() || undefined,
        location: body.location?.trim() || undefined,
        meta: metaFrom(body) || 'Proyek baru',
        createdAt: new Date().toISOString(),
      }
      // Deliberately writes no `/projects/<id>/…` rows: a new project starts
      // empty so no other project's figures can surface under its name.
      registry.projects = [...registry.projects, project]
      registry.activeId = id
      await writeRegistry(registry)
      return res.status(201).json({ project, registry })
    }

    /* ---- edit -------------------------------------------------------- */
    if (req.method === 'PATCH' || req.method === 'PUT') {
      const id = String(req.query.id ?? '')
      const registry = await readRegistry()
      const index = registry.projects.findIndex((p) => p.id === id)
      if (index === -1) return res.status(404).json({ error: 'proyek tidak ditemukan' })

      const body = (req.body ?? {}) as {
        name?: string
        units?: string
        area?: string
        location?: string
      }
      const current = registry.projects[index]
      const updated: Project = {
        ...current,
        name: (body.name ?? current.name).trim() || current.name,
        units: body.units?.trim() ?? current.units,
        area: body.area?.trim() ?? current.area,
        location: body.location?.trim() ?? current.location,
      }
      updated.meta = metaFrom(updated) || current.meta
      registry.projects[index] = updated
      await writeRegistry(registry)
      return res.status(200).json({ project: updated, registry })
    }

    /* ---- delete, with everything attached to it -------------------------- */
    if (req.method === 'DELETE') {
      const id = String(req.query.id ?? '')
      const registry = await readRegistry()
      if (!registry.projects.some((p) => p.id === id)) {
        return res.status(404).json({ error: 'proyek tidak ditemukan' })
      }
      if (registry.projects.length <= 1) {
        return res.status(400).json({ error: 'tidak bisa menghapus proyek terakhir' })
      }

      await sql`delete from store where path like ${'/projects/' + id + '/%'}`
      await sql`delete from knowledge_chunks where project_id = ${id}`
      await sql`delete from knowledge_docs where project_id = ${id}`
      await sql`delete from documents where project_id = ${id}`

      registry.projects = registry.projects.filter((p) => p.id !== id)
      if (registry.activeId === id) registry.activeId = registry.projects[0]?.id ?? ''
      await writeRegistry(registry)
      return res.status(200).json({ registry })
    }

    return res.status(405).json({ error: 'method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
}
