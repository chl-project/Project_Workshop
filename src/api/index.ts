import { bq as bqFixture, recalcHeader, recalcSteps } from '@/data/bq'
import { bmw as bmwFixture, defaultWeights } from '@/data/bmw'
import { cost as costFixture } from '@/data/cost'
import { dashboard as dashboardFixture } from '@/data/dashboard'
import { clashDetail, veDetail, volumeTrace } from '@/data/drawers'
import { komposit as kompositFixture } from '@/data/komposit'
import { activeProjectId, projects as projectFixture } from '@/data/projects'
import {
  emptyState,
  parseHeader,
  parseSteps,
  partialError,
  spesifikasi as spekFixture,
} from '@/data/spesifikasi'
import type {
  BmwData,
  BqData,
  ClashDetail,
  CompositeData,
  CostData,
  DashboardData,
  Project,
  SpecData,
  VeDetail,
  VolumeTrace,
} from '@/types'
import { getResource, run, saveResource } from './client'

/* Cache keys are the endpoints these calls will hit for real one day. */
export const keys = {
  projects: '/projects',
  dashboard: (p: string) => `/projects/${p}/dashboard`,
  spesifikasi: (p: string) => `/projects/${p}/spesifikasi`,
  cost: (p: string) => `/projects/${p}/build-up-cost`,
  bmw: (p: string) => `/projects/${p}/skenario`,
  komposit: (p: string) => `/projects/${p}/gambar-komposit`,
  bq: (p: string) => `/projects/${p}/bq`,
  volumeTrace: (item: string) => `/bq/items/${item}/penelusuran`,
  veDetail: (id: string) => `/ve/${id}`,
  clashDetail: (no: string) => `/clash/${no}`,
} as const

/**
 * The bundled sample projects. Anything else was created in the app and must
 * start empty: passing a `null` fallback stops a fresh project from being
 * seeded with these figures and presenting them as its own.
 */
const SAMPLE_IDS = new Set(projectFixture.map((p) => p.id))

export const isSampleProject = (projectId: string) => SAMPLE_IDS.has(projectId)

/** Supplies the fixture only for a sample project; real projects get nothing. */
const sampleOnly = <T>(projectId: string, fixture: () => T): (() => T) | null =>
  SAMPLE_IDS.has(projectId) ? fixture : null

/**
 * Reads the project registry from its own endpoint rather than the generic
 * store path.
 *
 * The generic path seeds its fixture whenever the row reads as missing, which
 * for this key means a single 404 would overwrite the saved registry with the
 * three samples — deleting every project the user had created. Here the server
 * is authoritative, and the samples are written only when it holds nothing at
 * all.
 */
export const fetchProjects = async (): Promise<{ projects: Project[]; activeId: string }> => {
  const samples = { projects: projectFixture, activeId: activeProjectId }
  try {
    const res = await fetch('/api/projects')
    if (res.ok) {
      const registry = (await res.json()) as { projects?: Project[]; activeId?: string }
      if (Array.isArray(registry.projects) && registry.projects.length > 0) {
        return {
          projects: registry.projects,
          activeId: registry.activeId || registry.projects[0].id,
        }
      }
      // Nothing stored yet: first run. Seed the samples so the app opens on
      // something, then let every later read come from the database.
      await saveResource(keys.projects, samples)
      return samples
    }
  } catch {
    /* API unreachable — fall through to the bundled samples, without writing. */
  }
  return samples
}

export const fetchDashboard = (projectId: string) =>
  getResource<DashboardData>(keys.dashboard(projectId), sampleOnly(projectId, () => dashboardFixture))

export const fetchSpesifikasi = (projectId: string) =>
  getResource<SpecData>(keys.spesifikasi(projectId), sampleOnly(projectId, () => spekFixture))

export const fetchCost = (projectId: string) =>
  getResource<CostData>(keys.cost(projectId), sampleOnly(projectId, () => costFixture))

export const fetchBmw = (projectId: string) =>
  getResource<{ data: BmwData; defaultWeights: typeof defaultWeights }>(
    keys.bmw(projectId),
    sampleOnly(projectId, () => ({ data: bmwFixture, defaultWeights })),
  )

export const fetchKomposit = (projectId: string) =>
  getResource<CompositeData>(keys.komposit(projectId), sampleOnly(projectId, () => kompositFixture))

export const fetchBq = (projectId: string) =>
  getResource<BqData>(keys.bq(projectId), sampleOnly(projectId, () => bqFixture))

export const fetchVolumeTrace = (itemNo: string) =>
  getResource<VolumeTrace>(keys.volumeTrace(itemNo), () => volumeTrace)

export const fetchVeDetail = (veId: string) =>
  getResource<VeDetail>(keys.veDetail(veId), () => veDetail)

export const fetchClashDetail = (no: string) =>
  getResource<ClashDetail>(keys.clashDetail(no), () => clashDetail)

/* ---- long-running jobs the UI shows progress for ------------------------ */

/** Re-parses the uploaded spec documents. Resolves to the parsed table. */
export const parseSpecDocuments = (projectId: string, ms = 2600) =>
  run(() => ({ projectId, data: spekFixture }), ms)

/** Recomputes volumes + BQ from the locked composite drawing set. */
export const recalculateBq = (projectId: string, ms = 3200) =>
  run(() => ({ projectId, data: bqFixture }), ms)

export { emptyState, parseHeader, parseSteps, partialError, recalcHeader, recalcSteps }

export { listDocuments, saveResource, uploadDocument, type DocumentRecord } from './client'
