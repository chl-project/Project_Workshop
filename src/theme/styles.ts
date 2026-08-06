import type { CSSProperties } from 'react'
import { color, mono, sans } from './tokens'

/**
 * Style fragments that repeat across screens in the prototype. One-off values
 * stay inline in the component that uses them, so the JSX keeps reading like
 * the design file.
 */

export const card: CSSProperties = {
  background: color.surface,
  border: `1px solid ${color.border}`,
  borderRadius: 10,
}

export const cardClipped: CSSProperties = { ...card, overflow: 'hidden' }

export const cardHeader: CSSProperties = {
  padding: '13px 16px',
  borderBottom: `1px solid ${color.borderSoft}`,
  font: sans('600 12.5px'),
}

/** Table `<th>` — the small mono all-caps column head used everywhere. */
export const th = (extra?: CSSProperties): CSSProperties => ({
  textAlign: 'left',
  padding: '9px 8px',
  font: mono('500 10.5px'),
  letterSpacing: '.05em',
  color: color.muted,
  borderBottom: `1px solid ${color.borderSoft}`,
  ...extra,
})

export const table: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  font: sans('400 12px'),
}

export const theadRow: CSSProperties = { background: color.surfaceMuted }

export const bodyRow: CSSProperties = { borderBottom: `1px solid ${color.rowLine}` }

export type ChipTone = 'green' | 'amber' | 'red' | 'neutral'

const chipTones: Record<ChipTone, { bg: string; fg: string }> = {
  green: { bg: color.chipGreenBg, fg: color.greenText },
  amber: { bg: color.amberChipBg, fg: color.amberText },
  red: { bg: color.redChipBg, fg: color.redText },
  neutral: { bg: color.borderSoft, fg: color.muted },
}

export const chip = (tone: ChipTone): CSSProperties => ({
  font: mono('500 10.5px'),
  padding: '3px 8px',
  borderRadius: 20,
  background: chipTones[tone].bg,
  color: chipTones[tone].fg,
  whiteSpace: 'nowrap',
})

export const btnPrimary: CSSProperties = {
  border: 0,
  cursor: 'pointer',
  background: color.green,
  color: color.surface,
  borderRadius: 7,
  padding: '8px 14px',
  font: sans('500 12px'),
}

export const btnGhost: CSSProperties = {
  border: `1px solid ${color.border}`,
  background: color.surfaceSoft,
  cursor: 'pointer',
  borderRadius: 7,
  padding: '8px 14px',
  font: sans('500 12px'),
  color: color.inkSoft,
}

export const btnTint: CSSProperties = {
  border: `1px solid ${color.greenLine}`,
  background: color.greenTint,
  color: color.green,
  cursor: 'pointer',
  borderRadius: 7,
  padding: '8px',
  font: sans('500 12px'),
}

/** Vertical hairline used inside horizontal metric strips. */
export const vRule: CSSProperties = { width: 1, alignSelf: 'stretch', background: color.borderSoft }

export const kicker: CSSProperties = {
  font: mono('400 10.5px'),
  letterSpacing: '.06em',
  color: color.faint,
}

export const screenTitle: CSSProperties = {
  font: sans('600 18px/1.25'),
  letterSpacing: '-.02em',
}

export const screenSub: CSSProperties = {
  font: sans('400 12.5px/1.55'),
  color: color.muted,
  marginTop: 5,
}
