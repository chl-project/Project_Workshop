import type { ChipTone } from '@/theme/styles'

/* ------------------------------------------------------------------ shared */

export type ScreenId = 'dash' | 'spek' | 'cost' | 'bmw' | 'gbr' | 'bq' | 'know' | 'chat'

export interface Project {
  id: string
  name: string
  units?: string
  area?: string
  location?: string
  /** Set on projects created in the app; absent on the bundled samples. */
  createdAt?: string
  /** e.g. "48 unit · 2.996 m² · Bekasi" */
  meta: string
}

/* --------------------------------------------------------------- dashboard */

export interface Kpi {
  label: string
  value: string
  /** small unit rendered at 14px next to the value, e.g. " M" */
  unit?: string
  valueColor?: string
  note: string
  noteColor?: string
}

export interface ModuleCard {
  screen: ScreenId
  glyph: string
  badge: string
  badgeTone: ChipTone
  title: string
  body: string
  /** the BQ card spans both grid columns and uses a solid CTA */
  wide?: boolean
}

export interface AlertItem {
  severity: 'critical' | 'major'
  title: string
  meta: string
}

export interface ActivityItem {
  title: string
  meta: string
}

export interface DashboardData {
  greeting: string
  subtitle: string
  versionNote: string
  kpis: Kpi[]
  modules: ModuleCard[]
  alerts: AlertItem[]
  activity: ActivityItem[]
}

/* ----------------------------------------------------- spesifikasi & material */

export type SpecScreenState = 'full' | 'empty' | 'load' | 'err'

export type MaterialStatus = 'clear' | 'ambiguous' | 'overspec' | 'unavailable'

export interface MaterialRow {
  id: string
  division: string
  item: string
  spec: string
  standard: string
  volume: string
  status: MaterialStatus
  statusLabel: string
}

export interface SpecFinding {
  title: string
  body: string
}

export interface MaterialAlternative {
  name: string
  delta: string
  availability: string
  note: string
}

export interface SpecData {
  documents: string[]
  projectClasses: string[]
  activeClass: string
  itemCount: number
  divisionCount: number
  materials: MaterialRow[]
  shownCount: number
  findings: SpecFinding[]
  openFindings: number
  alternativesFor: string
  alternatives: MaterialAlternative[]
}

/* --------------------------------------------------------- build up cost & ve */

export interface CostSummary {
  perM2: string
  perM2Note: string
  total: string
  totalRange: string
  facts: string[]
}

export interface EstimationParam {
  label: string
  value: string
}

export interface BreakdownRow {
  component: string
  contents: string
  share: string
  /** width fraction of the stacked bar, in percent */
  sharePct: number
  barColor: string
  typical: string
  cost: string
}

export interface BenchmarkBar {
  label: string
  value: string
  pct: number
  color: string
  muted?: boolean
}

export type VeStatus = 'approved' | 'proposed' | 'deferred' | 'rejected'

export interface VeRow {
  id: string
  item: string
  change: string
  saving: string
  savingPct: string
  savingMuted?: boolean
  quality: string
  qualityColor?: string
  time: string
  timeColor?: string
  status: VeStatus
  statusLabel: string
  dimmed?: boolean
}

export interface WaterfallStep {
  label: string
  value: string
  valueColor?: string
  kind: 'bar' | 'delta'
  width: number
  /** bars: pixel height. deltas: pixel offset from the baseline + thickness */
  height: number
  bottom?: number
  color: string
  dashed?: boolean
}

export interface CostData {
  summary: CostSummary
  params: EstimationParam[]
  breakdown: BreakdownRow[]
  breakdownTotal: { share: string; cost: string }
  breakdownBasis: string
  benchmark: {
    title: string
    subtitle: string
    bars: BenchmarkBar[]
    marketRange: { label: string; value: string; from: number; width: number; marker: number }
    note: string
  }
  ve: {
    count: number
    totalSaving: string
    totalSavingPct: string
    approvedSaving: string
    approvedSavingPct: string
    waterfall: WaterfallStep[]
    rows: VeRow[]
  }
}

/* ------------------------------------------------------- biaya–mutu–waktu */

export type ScenarioKey = 'basic' | 'std' | 'prem'

export interface Scenario {
  key: ScenarioKey
  name: string
  subtitle: string
  isBase?: boolean
  cost: { total: string; perM2: string; delta: string; deltaColor?: string }
  quality: string[]
  /** the last quality line is colour-coded */
  qualityFlagColor: string
  time: { weeks: string; lines: string[] }
  risk: string
  /** raw 0–100 axis scores driving both the weighted score and the radar */
  axes: { b: number; m: number; t: number }
  recommendation: { why: string; watch: string }
}

export interface SensitivityRow {
  label: string
  impact: string
}

export interface BmwData {
  scenarios: Scenario[]
  sensitivity: { title: string; subtitle: string; rows: SensitivityRow[] }
}

/* ---------------------------------------------------------- gambar komposit */

export interface Discipline {
  name: string
  accent?: string
  status: string
  statusTone: ChipTone
  lines: string[]
  placeholder?: boolean
}

export type ClashLevel = 'Kritis' | 'Mayor' | 'Minor'

export interface ClashRow {
  no: string
  location: string
  disciplines: string
  problem: string
  level: ClashLevel
  pic: string
  status: string
  statusColor: string
}

export interface ChecklistItem {
  state: 'fail' | 'warn' | 'ok'
  label: string
}

export interface CompositeData {
  disciplines: Discipline[]
  clashes: ClashRow[]
  clashTotal: number
  checklist: ChecklistItem[]
  lockBlockedNote: string
  coordination: {
    doneNote: string
    donePct: number
    counts: { label: string; value: string; color: string }[]
  }
}

/* ------------------------------------------------------------------ bq / rab */

export type Confidence = 'Tinggi' | 'Sedang' | 'Perlu verifikasi'

export interface BqItem {
  no: string
  description: string
  unit: string
  volume: string
  unitPrice: string
  amount: string
  confidence: Confidence
  /** row tint used to mark the item the volume drawer traces */
  highlight?: boolean
}

export interface BqDivision {
  no: number
  title: string
  amount: string
  items: BqItem[]
  /** e.g. "7 item struktur lainnya" */
  restLabel?: string
  restAmount?: string
  /** divisions 5 & 6 are shown collapsed with no rows behind them */
  collapsedOnly?: boolean
  defaultOpen?: boolean
}

export interface RecapRow {
  label: string
  amount: string
  emphasis?: 'sub' | 'total' | 'final'
}

export interface VersionRow {
  item: string
  v1: string
  v2: string
  delta: string
  deltaColor: string
  reason: string
}

export interface BqData {
  source: { drawings: string; drawingsNote: string; prices: string; ohProfit: string }
  divisions: BqDivision[]
  grandTotal: { label: string; meta: string; amount: string }
  warnings: { severity: 'critical' | 'major'; text: string }[]
  confidence: { segments: { pct: number; color: string }[]; rows: { label: string; value: string }[] }
  recap: RecapRow[]
  finalPerM2: { value: string; note: string }
  recapNote: string
  versions: {
    title: string
    meta: string
    rows: VersionRow[]
    totalDelta: string
  }
}

/* ------------------------------------------- build up cost — bill of quantities */

/**
 * One printed line of the bill.
 *
 * A bill is not a flat table: between the priced items sit description-only
 * lines ("Formwork; as described in the specifications and drawings to:-") that
 * every following item hangs off. Keeping them as lines rather than dropping
 * them is what makes the export readable next to the source document.
 */
export interface BqLine {
  kind: 'heading' | 'item'
  description: string
  unit?: string
  qty?: number
  /** Supply PC Rate — the material at the gate. */
  supply?: number
  /** Accessories Rate — fixings, adhesives, ancillaries. */
  accessories?: number
  profit?: number
  waste?: number
  labour?: number
  /** Derived: supply + accessories + profit + waste + labour. */
  rate?: number
  /** Derived: qty × rate. */
  amount?: number
  /** Stands in for the amount when an item carries no price ("Excluded"). */
  note?: string
}

export interface BqSection {
  /** Bill reference letter — A, B, C … */
  ref: string
  title: string
  lines: BqLine[]
  /** Derived from the section's item amounts. */
  subtotal: number
  /** Replaces the figure when the work is priced elsewhere. */
  subtotalNote?: string
}

/** One component line of an analisa harga satuan. */
export interface AhsRow {
  description: string
  qty?: number
  unit?: string
  unitPrice?: number
  /** Derived: qty × unitPrice. */
  total?: number
}

export interface AhsAnalysis {
  no: number
  title: string
  rows: AhsRow[]
  /** Derived: sum of the component totals. */
  total: number
}

/** Percentages applied on top of the supply rate when the user overrides them. */
export interface BqMarkup {
  profitPct: number | null
  wastePct: number | null
}

export interface BuildUpDoc {
  title: string
  project: string
  location: string
  /** The unit or building the bill covers, e.g. "UNIT T8 STD". */
  unit: string
  currency: string
  sections: BqSection[]
  /** Lump sums carried beside the measured work in the collection page. */
  preliminaries: { label: string; amount: number }[]
  grandTotalLabel: string
  /** Derived: section subtotals + preliminaries. */
  grandTotal: number
  /**
   * Total gross floor area in m² — every floor plate added together, not the
   * footprint and not the plot. Drives the cost-per-m² sanity check, so a wrong
   * one makes a sound bill look under-priced.
   */
  areaM2?: number
  /** Where `areaM2` came from. A drawing without dimensions yields neither. */
  areaSource?: 'drawing' | 'user'
  /** Per-floor plates the model measured, e.g. ["Lantai 1 — 34 m²", …]. */
  areaBreakdown?: string[]
  ahs: AhsAnalysis[]
  /** What the model had to assume — read this before trusting the figures. */
  assumptions: string[]
  /** File names the bill was read from. */
  sources: string[]
  generatedAt: string
  /** Set when the source had no text layer and was read by OCR. */
  ocr?: boolean
  markup?: BqMarkup
  /** Price basis the rates were quoted on, e.g. "AHSP 2026 · DKI Jakarta". */
  basis?: string
}

/* -------------------------------------------------------------- drawer data */

export interface VolumeTrace {
  kicker: string
  title: string
  /** `accent` marks the green result lines in the calculation block */
  formulaLines: { text: string; accent?: boolean }[]
  facts: { label: string; value: string }[]
  total: { label: string; value: string }
  drawingCaption: string
}

export interface VeDetail {
  kicker: string
  title: string
  saving: string
  savingNote: string
  before: string
  after: string
  facts: { label: string; value: string; valueColor?: string; chip?: ChipTone }[]
  risk: string
}

export interface ClashDetail {
  kicker: string
  title: string
  level: ClashLevel
  location: string
  problem: string
  recommendation: string
  facts: { label: string; value: string; valueColor?: string }[]
  drawingCaption: string
}
