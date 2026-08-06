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
import { get, run } from './client'

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

export const fetchProjects = () =>
  get<{ projects: Project[]; activeId: string }>(keys.projects, () => ({
    projects: projectFixture,
    activeId: activeProjectId,
  }))

export const fetchDashboard = (projectId: string) =>
  get<DashboardData>(keys.dashboard(projectId), () => dashboardFixture)

export const fetchSpesifikasi = (projectId: string) =>
  get<SpecData>(keys.spesifikasi(projectId), () => spekFixture)

export const fetchCost = (projectId: string) => get<CostData>(keys.cost(projectId), () => costFixture)

export const fetchBmw = (projectId: string) =>
  get<{ data: BmwData; defaultWeights: typeof defaultWeights }>(keys.bmw(projectId), () => ({
    data: bmwFixture,
    defaultWeights,
  }))

export const fetchKomposit = (projectId: string) =>
  get<CompositeData>(keys.komposit(projectId), () => kompositFixture)

export const fetchBq = (projectId: string) => get<BqData>(keys.bq(projectId), () => bqFixture)

export const fetchVolumeTrace = (itemNo: string) =>
  get<VolumeTrace>(keys.volumeTrace(itemNo), () => volumeTrace)

export const fetchVeDetail = (veId: string) => get<VeDetail>(keys.veDetail(veId), () => veDetail)

export const fetchClashDetail = (no: string) => get<ClashDetail>(keys.clashDetail(no), () => clashDetail)

/* ---- long-running jobs the UI shows progress for ------------------------ */

/** Re-parses the uploaded spec documents. Resolves to the parsed table. */
export const parseSpecDocuments = (projectId: string, ms = 2600) =>
  run(() => ({ projectId, data: spekFixture }), ms)

/** Recomputes volumes + BQ from the locked composite drawing set. */
export const recalculateBq = (projectId: string, ms = 3200) =>
  run(() => ({ projectId, data: bqFixture }), ms)

export { emptyState, parseHeader, parseSteps, partialError, recalcHeader, recalcSteps }
