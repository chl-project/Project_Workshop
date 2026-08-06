import { clearCache } from '@/api/client'
import type { Project } from '@/types'

/** Client for creating and managing projects. */

const API_BASE = '/api'
const API_KEY = import.meta.env.VITE_API_KEY as string | undefined

export interface Registry {
  projects: Project[]
  activeId: string
}

export interface ProjectInput {
  name: string
  units?: string
  area?: string
  location?: string
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (API_KEY) h['x-api-key'] = API_KEY
  return h
}

async function errorFrom(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  return body.error ?? `Gagal (${res.status})`
}

/**
 * Every mutation invalidates the read cache: the project list changed, and a
 * deleted project's rows must not stay served from memory.
 */
async function mutate(url: string, init: RequestInit): Promise<Registry> {
  const res = await fetch(url, { headers: headers(), ...init })
  if (!res.ok) throw new Error(await errorFrom(res))
  const body = (await res.json()) as { registry: Registry }
  clearCache()
  return body.registry
}

export async function createProject(input: ProjectInput): Promise<Registry> {
  return mutate(`${API_BASE}/projects`, { method: 'POST', body: JSON.stringify(input) })
}

export async function updateProject(id: string, input: ProjectInput): Promise<Registry> {
  return mutate(`${API_BASE}/projects?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function duplicateProject(id: string, name?: string): Promise<Registry> {
  return mutate(`${API_BASE}/projects?action=duplicate&id=${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function deleteProject(id: string): Promise<Registry> {
  return mutate(`${API_BASE}/projects?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}
