import type { Scenario, ScenarioKey } from '@/types'

export interface Weights {
  b: number
  m: number
  t: number
}

export type WeightKey = keyof Weights

/**
 * Moving one slider redistributes the remainder across the other two in
 * proportion to their current values, so the three always sum to 100.
 */
export function rebalance(weights: Weights, key: WeightKey, value: number): Weights {
  const next = { ...weights }
  const others = (['b', 'm', 't'] as WeightKey[]).filter((k) => k !== key)
  const rest = 100 - value
  const current = next[others[0]] + next[others[1]]

  if (current === 0) {
    next[others[0]] = Math.round(rest / 2)
  } else {
    next[others[0]] = Math.round((rest * next[others[0]]) / current)
  }
  next[others[1]] = rest - next[others[0]]
  next[key] = value
  return next
}

/** Weighted score of one scenario, 0–100 with one decimal. */
export function score(scenario: Scenario, w: Weights): number {
  const { b, m, t } = scenario.axes
  return (b * w.b + m * w.m + t * w.t) / 100
}

export const formatScore = (value: number) => value.toFixed(1)

/** Radar geometry: MUTU up, WAKTU lower-right, BIAYA lower-left. */
export function radarPoints(scenario: Scenario): string {
  const cx = 100
  const cy = 110
  const R = 92
  const point = (angle: number, value: number) =>
    [cx + Math.cos(angle) * R * (value / 100), cy + Math.sin(angle) * R * (value / 100)] as const

  return [
    point(-Math.PI / 2, scenario.axes.m),
    point(Math.PI / 6, scenario.axes.t),
    point((Math.PI * 5) / 6, scenario.axes.b),
  ]
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
}

export interface Recommendation {
  key: ScenarioKey
  name: string
  why: string
  watch: string
}

/** Highest weighted score wins; the copy names the margin over the runner-up. */
export function recommend(scenarios: Scenario[], w: Weights): Recommendation {
  const ranked = scenarios
    .map((s) => ({ scenario: s, value: score(s, w) }))
    .sort((a, b) => b.value - a.value)

  const winner = ranked[0]
  const runnerUp = ranked[1]
  const gap = (winner.value - runnerUp.value).toFixed(1)

  return {
    key: winner.scenario.key,
    name: `${winner.scenario.name} · skor ${formatScore(winner.value)}`,
    why: `${winner.scenario.recommendation.why} Unggul ${gap} poin dari ${runnerUp.scenario.name}.`,
    watch: winner.scenario.recommendation.watch,
  }
}
