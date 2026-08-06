import { basisForPrompt, priceBasis } from '@/data/priceBasis'
import type { AhsAnalysis, BqLine, BqMarkup, BqSection, BuildUpDoc } from '@/types'

/**
 * Client for the bill-of-quantities builder, plus the arithmetic behind it.
 *
 * The model reads the uploaded drawings and returns quantities and unit prices;
 * it does not do the sums. Every rate, amount, subtotal and total on screen is
 * recomputed here from those inputs, so the bill always adds up — a model that
 * slips a digit in a total cannot put a wrong figure in front of the user, and
 * changing the profit or waste percentage reprices the whole bill instantly.
 */

/** Sums the build-up columns; a line the model priced directly keeps its rate. */
function lineRate(line: BqLine, markup: BqMarkup): number | undefined {
  const supply = line.supply
  const pct = (value: number | null | undefined) =>
    value == null || supply == null ? undefined : (supply * value) / 100

  const profit = pct(markup.profitPct) ?? line.profit
  const waste = pct(markup.wastePct) ?? line.waste
  const parts = [supply, line.accessories, profit, waste, line.labour]

  if (parts.every((p) => p == null)) return line.rate
  return parts.reduce<number>((sum, p) => sum + (p ?? 0), 0)
}

const NO_MARKUP: BqMarkup = { profitPct: null, wastePct: null }

/**
 * Recomputes every derived figure in the bill.
 *
 * Called on the model's raw reply and again on every markup change, so the two
 * paths can never drift apart.
 */
export function recompute(doc: BuildUpDoc, markup: BqMarkup = doc.markup ?? NO_MARKUP): BuildUpDoc {
  const sections: BqSection[] = doc.sections.map((section) => {
    const lines = section.lines.map((line) => {
      if (line.kind === 'heading') return { ...line }
      const supply = line.supply
      const rate = lineRate(line, markup)
      const amount = line.qty != null && rate != null ? line.qty * rate : undefined
      return {
        ...line,
        profit:
          markup.profitPct != null && supply != null
            ? (supply * markup.profitPct) / 100
            : line.profit,
        waste:
          markup.wastePct != null && supply != null ? (supply * markup.wastePct) / 100 : line.waste,
        rate,
        amount,
      }
    })
    return {
      ...section,
      lines,
      subtotal: lines.reduce((sum, l) => sum + (l.amount ?? 0), 0),
    }
  })

  const ahs: AhsAnalysis[] = doc.ahs.map((analysis) => {
    const rows = analysis.rows.map((row) => ({
      ...row,
      total: row.qty != null && row.unitPrice != null ? row.qty * row.unitPrice : row.total,
    }))
    return { ...analysis, rows, total: rows.reduce((sum, r) => sum + (r.total ?? 0), 0) }
  })

  const measured = sections.reduce((sum, s) => sum + s.subtotal, 0)
  const prelim = doc.preliminaries.reduce((sum, p) => sum + (p.amount || 0), 0)

  return { ...doc, sections, ahs, markup, grandTotal: measured + prelim }
}

/** The percentages the model itself applied, inferred from the priced lines. */
export function inferMarkup(doc: BuildUpDoc): { profitPct: number | null; wastePct: number | null } {
  const priced = doc.sections
    .flatMap((s) => s.lines)
    .filter((l) => l.kind === 'item' && l.supply != null && l.supply > 0)

  const share = (pick: (l: BqLine) => number | undefined) => {
    const values = priced.map((l) => ((pick(l) ?? 0) / (l.supply as number)) * 100)
    if (values.length === 0) return null
    const first = values[0]
    // Only report a percentage the whole bill agrees on; a mixed bill has none.
    return values.every((v) => Math.abs(v - first) < 0.05) ? Math.round(first * 10) / 10 : null
  }

  return { profitPct: share((l) => l.profit), wastePct: share((l) => l.waste) }
}

/* ------------------------------------------------------------- formatting */

const idr = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })
const qtyFormat = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const formatIdr = (value: number | undefined): string =>
  value == null ? '' : idr.format(Math.round(value))

export const formatQty = (value: number | undefined): string =>
  value == null ? '' : qtyFormat.format(value)

/** Short form for headline figures: "1,43 M" / "798,3 jt". */
export function formatShort(value: number): string {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2).replace('.', ',')} M`
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1).replace('.', ',')} jt`
  return idr.format(Math.round(value))
}

/** Total number of priced items across the bill — shown in the header. */
export const countItems = (doc: BuildUpDoc): number =>
  doc.sections.reduce((n, s) => n + s.lines.filter((l) => l.kind === 'item').length, 0)

/* --------------------------------------------------------------- transport */

export interface GenerateInput {
  projectId: string
  projectName: string
  filename: string
  text: string
  /** Building type / scope hint the user typed, passed through to the model. */
  hint?: string
  /** Answers to the questions from a previous pass, treated as fact. */
  answers?: { question: string; answer: string }[]
}

/**
 * How much extracted text is kept with the bill so the estimate can be re-run
 * when the user answers a question. Matches the server's own prompt cap —
 * keeping more would bloat the stored row without reaching the model.
 */
const KEEP_TEXT = 90_000

/**
 * The app's price basis travels with the request, so a generated bill is priced
 * against the same anchors the rest of the app quotes rather than the model's
 * own idea of Indonesian market rates — which reads low and out of date.
 */
const withBasis = (input: GenerateInput) => ({ ...input, basis: basisForPrompt() })

/**
 * Sends the extracted document text to the server, which asks the model for a
 * bill in the shape of `BuildUpDoc`. The reply is normalised and recomputed
 * before it reaches the screen.
 */
export async function generateBuildUp(input: GenerateInput): Promise<BuildUpDoc> {
  const res = await fetch('/api/build-up', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withBasis(input)),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Gagal menyusun BQ (${res.status})`)
  }
  const body = (await res.json()) as { doc?: BuildUpDoc; error?: string }
  if (!body.doc) throw new Error(body.error ?? 'AI tidak mengembalikan hasil.')

  // Surface the percentages the model actually applied, so the toolbar opens on
  // "10%" rather than a blank box the user has to guess at. A bill that priced
  // each line differently has no single percentage and keeps its per-line values.
  const doc = recompute({
    ...body.doc,
    basis: priceBasis.label,
    sourceText: input.text.slice(0, KEEP_TEXT),
  })
  return recompute(doc, inferMarkup(doc))
}

/**
 * Fills in the collections a stored bill may predate.
 *
 * Bills are saved as JSON and read back as-is, so one written before questions
 * existed comes back without that array — and the panel would throw on it.
 * Every read goes through here.
 */
export function withDefaults(doc: BuildUpDoc | null): BuildUpDoc | null {
  if (!doc) return null
  return {
    ...doc,
    sections: doc.sections ?? [],
    ahs: doc.ahs ?? [],
    preliminaries: doc.preliminaries ?? [],
    assumptions: doc.assumptions ?? [],
    questions: doc.questions ?? [],
    sources: doc.sources ?? [],
  }
}

/** Records an answer, and applies it to the floor area when it sets one. */
export function answerQuestion(doc: BuildUpDoc, id: string, answer: string): BuildUpDoc {
  const questions = doc.questions.map((q) =>
    q.id === id ? { ...q, answer: answer.trim() || undefined } : q,
  )
  const answered = questions.find((q) => q.id === id)

  if (answered?.target === 'areaM2') {
    const m2 = Number((answered.answer ?? '').replace(',', '.').replace(/[^\d.]/g, ''))
    const valid = Number.isFinite(m2) && m2 > 0
    return {
      ...doc,
      questions,
      areaM2: valid ? m2 : undefined,
      areaSource: valid ? 'user' : undefined,
    }
  }
  return { ...doc, questions }
}

/**
 * Re-runs the estimate with the answers folded in.
 *
 * The document text travels with the bill, so this needs no re-upload. The
 * user's own corrections — floor area, profit and waste — are carried across,
 * since they outrank anything the model reads a second time.
 */
export async function regenerateWithAnswers(
  doc: BuildUpDoc,
  projectId: string,
  projectName: string,
): Promise<BuildUpDoc> {
  if (!doc.sourceText) {
    throw new Error(
      'Teks dokumen aslinya tidak tersimpan pada BQ ini. Unggah ulang dokumennya untuk ' +
        'menghitung dengan jawaban tadi.',
    )
  }

  const answers = doc.questions
    .filter((q) => q.answer)
    .map((q) => ({ question: q.question, answer: q.answer as string }))
  if (answers.length === 0) throw new Error('Belum ada pertanyaan yang dijawab.')

  const fresh = await generateBuildUp({
    projectId,
    projectName,
    filename: doc.sources[0] ?? 'dokumen',
    text: doc.sourceText,
    answers,
  })

  return recompute(
    {
      ...fresh,
      sources: doc.sources,
      areaM2: doc.areaSource === 'user' ? doc.areaM2 : fresh.areaM2,
      areaSource: doc.areaSource === 'user' ? 'user' : fresh.areaSource,
      // Keep answered questions visible even once the model stops asking, so
      // the user can see what the new figures were built on.
      questions: mergeQuestions(fresh.questions, doc.questions),
    },
    doc.markup ?? inferMarkup(fresh),
  )
}

/** Fresh questions first, then the answered ones the model dropped. */
function mergeQuestions(fresh: BuildUpDoc['questions'], previous: BuildUpDoc['questions']) {
  const answers = new Map(previous.filter((q) => q.answer).map((q) => [q.id, q]))
  const carried = fresh.map((q) => (q.answer ? q : { ...q, answer: answers.get(q.id)?.answer }))
  const ids = new Set(carried.map((q) => q.id))
  return [...carried, ...[...answers.values()].filter((q) => !ids.has(q.id))]
}

/**
 * Merges a second document into a bill already on screen.
 *
 * Uploading the structural drawings after the architectural ones should extend
 * the bill, not replace it: sections that already exist absorb the new lines,
 * and anything genuinely new is appended with the next free reference letter.
 */
export function mergeDoc(base: BuildUpDoc, incoming: BuildUpDoc): BuildUpDoc {
  const sections = base.sections.map((s) => ({ ...s, lines: [...s.lines] }))
  const keyOf = (title: string) => title.trim().toLowerCase()
  const index = new Map(sections.map((s, i) => [keyOf(s.title), i]))

  for (const section of incoming.sections) {
    const at = index.get(keyOf(section.title))
    if (at != null) {
      const seen = new Set(sections[at].lines.map((l) => l.description.trim().toLowerCase()))
      sections[at].lines.push(
        ...section.lines.filter((l) => !seen.has(l.description.trim().toLowerCase())),
      )
    } else {
      index.set(keyOf(section.title), sections.length)
      sections.push({ ...section, ref: refFor(sections.length), lines: [...section.lines] })
    }
  }

  const ahsSeen = new Set(base.ahs.map((a) => a.title.trim().toLowerCase()))
  const ahs = [
    ...base.ahs,
    ...incoming.ahs.filter((a) => !ahsSeen.has(a.title.trim().toLowerCase())),
  ].map((a, i) => ({ ...a, no: i + 1 }))

  return recompute({
    ...base,
    sections,
    ahs,
    assumptions: [...new Set([...base.assumptions, ...incoming.assumptions])],
    sources: [...new Set([...base.sources, ...incoming.sources])],
    areaM2: base.areaM2 ?? incoming.areaM2,
    areaSource: base.areaSource ?? incoming.areaSource,
    areaBreakdown: base.areaBreakdown ?? incoming.areaBreakdown,
    // The second document often answers what the first left open, so keep the
    // questions the user already answered and add whatever is still missing.
    questions: mergeQuestions(incoming.questions, base.questions),
    sourceText: [base.sourceText, incoming.sourceText]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, KEEP_TEXT),
    ocr: base.ocr || incoming.ocr,
  })
}

/** A, B … Z, then AA — the bill's reference column. */
function refFor(index: number): string {
  let ref = ''
  let n = index
  do {
    ref = String.fromCharCode(65 + (n % 26)) + ref
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return ref
}
