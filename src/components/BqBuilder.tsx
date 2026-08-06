import { useRef, useState } from 'react'
import { fetchBuildUp, fetchProjects, keys, saveResource, uploadDocument } from '@/api'
import { isSupportedFile } from '@/lib/extract'
import { readDocument } from '@/lib/ocr'
import { generateBuildUp, inferMarkup, mergeDoc, recompute } from '@/lib/buildup'
import {
  exportBuildUpCsv,
  exportBuildUpJson,
  exportBuildUpPdf,
  exportBuildUpXlsx,
} from '@/lib/buildupExport'
import { priceBasis } from '@/data/priceBasis'
import { AiBanner } from '@/components/AiBanner'
import { BqView } from '@/components/BqView'
import { ErrorPanel, LoadingPanel, ProgressStep, type StepState } from '@/components/primitives'
import { useResource } from '@/hooks/useResource'
import { btnGhost, btnPrimary, card } from '@/theme/styles'
import { color, mono, sans } from '@/theme/tokens'
import type { BuildUpDoc } from '@/types'

/**
 * Upload a drawing set, get a priced bill.
 *
 * The document is read in the browser — a CAD-exported PDF through its text
 * layer, a scanned one through OCR — and only the text goes to the model, which
 * returns quantities and unit prices. Everything that adds up is computed
 * locally, so the profit and waste percentages reprice the whole bill without
 * another round trip.
 *
 * A second upload extends the bill rather than replacing it: architectural and
 * structural drawings usually arrive as separate files.
 */

type Stage = 'idle' | 'reading' | 'thinking' | 'error'

const ACCEPT = '.pdf,.dxf,.dwg,.xlsx,.xls,.csv,.txt,.md,.png,.jpg,.jpeg,.webp'

/** Shown above a generated bill — the figures are derived, not measured. */
const AI_CAUTION =
  'Volume di bill ini diturunkan AI dari gambar yang diunggah, bukan hasil pengukuran. ' +
  'Periksa tab Asumsi sebelum angkanya dipakai untuk penawaran atau kontrak.'

export function BqBuilder({
  projectId,
  showAiBanner,
}: {
  projectId: string
  showAiBanner: boolean
}) {
  const stored = useResource<BuildUpDoc | null>(keys.buildUp(projectId), () =>
    fetchBuildUp(projectId),
  )
  const projects = useResource(keys.projects, fetchProjects)

  const [override, setOverride] = useState<BuildUpDoc | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [message, setMessage] = useState('')
  const [problem, setProblem] = useState('')
  const [hint, setHint] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const doc = override ?? stored.data ?? null
  const busy = stage === 'reading' || stage === 'thinking'
  const projectName =
    projects.data?.projects.find((p) => p.id === projectId)?.name ?? ''

  const persist = async (next: BuildUpDoc) => {
    setOverride(next)
    await saveResource(keys.buildUp(projectId), next)
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || busy) return
    setProblem('')

    let current = doc
    try {
      for (const file of Array.from(files)) {
        if (!isSupportedFile(file.name)) {
          throw new Error(
            `${file.name}: format ini belum bisa dibaca. Ekspor gambar CAD ke PDF lebih dulu, ` +
              'atau unggah XLSX/CSV/gambar.',
          )
        }

        setStage('reading')
        const read = await readDocument(file, setMessage)

        setStage('thinking')
        setMessage(
          `Menyusun bill of quantities dari ${file.name}${read.ocr ? ' (hasil pindai)' : ''}…`,
        )
        const fresh = await generateBuildUp({
          projectId,
          projectName,
          filename: file.name,
          text: read.text,
          hint: hint.trim() || undefined,
        })
        fresh.ocr = read.ocr
        current = current ? mergeDoc(current, fresh) : fresh

        // Keep the source file with the project; a missing Blob token must not
        // cost the user the bill that was just generated.
        void uploadDocument(projectId, file).catch(() => undefined)
      }

      if (current) await persist(current)
      setStage('idle')
      setMessage('')
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'Gagal memproses dokumen.')
      setStage('error')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const setMarkup = (patch: { profitPct?: number | null; wastePct?: number | null }) => {
    if (!doc) return
    const current = doc.markup ?? inferMarkup(doc)
    void persist(recompute(doc, { ...current, ...patch }))
  }

  if (stored.loading) return <LoadingPanel label="Memuat build up cost…" />
  if (stored.error) return <ErrorPanel error={stored.error} />

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        onChange={(e) => void handleFiles(e.target.files)}
        style={{ display: 'none' }}
      />

      {busy ? (
        <Working stage={stage} message={message} />
      ) : (
        <Dropzone
          hasDoc={Boolean(doc)}
          dragging={dragging}
          hint={hint}
          onHint={setHint}
          onPick={() => inputRef.current?.click()}
          onDragState={setDragging}
          onDrop={(files) => void handleFiles(files)}
        />
      )}

      {problem && (
        <div
          style={{
            background: color.redPanelBg,
            border: `1px solid ${color.redPanelBorder}`,
            borderRadius: 10,
            padding: '13px 16px',
            font: sans('400 12px/1.6'),
            color: color.redPanelText,
            marginTop: 12,
          }}
        >
          {problem}
        </div>
      )}

      {doc && (
        <>
          <Toolbar doc={doc} busy={busy} onMarkup={setMarkup} onAdd={() => inputRef.current?.click()} />
          {showAiBanner && <AiBanner text={AI_CAUTION} marginBottom={16} />}
          <BqView doc={doc} />
        </>
      )}
    </>
  )
}

/* --------------------------------------------------------------- dropzone */

function Dropzone({
  hasDoc,
  dragging,
  hint,
  onHint,
  onPick,
  onDragState,
  onDrop,
}: {
  hasDoc: boolean
  dragging: boolean
  hint: string
  onHint: (v: string) => void
  onPick: () => void
  onDragState: (v: boolean) => void
  onDrop: (files: FileList) => void
}) {
  if (hasDoc) return null

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        onDragState(true)
      }}
      onDragLeave={() => onDragState(false)}
      onDrop={(e) => {
        e.preventDefault()
        onDragState(false)
        onDrop(e.dataTransfer.files)
      }}
      style={{
        ...card,
        border: `1px dashed ${dragging ? color.green : color.borderDashed}`,
        background: dragging ? color.greenTint : color.surface,
        padding: '46px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        textAlign: 'center',
      }}
    >
      <svg width="150" height="92" viewBox="0 0 150 92" role="img" aria-label="Unggah gambar kerja">
        <rect x="18" y="8" width="114" height="76" rx="4" fill="#FAFAF7" stroke="#DCDCD3" />
        <path d="M30 74 L54 40 L72 62 L88 46 L120 74 Z" fill="#EDEFE3" stroke="#C9D0AE" />
        <rect x="30" y="16" width="40" height="4" rx="2" fill="#E4E4DE" />
        <rect x="30" y="25" width="26" height="4" rx="2" fill="#E4E4DE" />
        <circle cx="104" cy="30" r="9" fill="none" stroke="#C9D0AE" strokeWidth="1.5" />
      </svg>

      <div style={{ font: sans('600 14px') }}>Unggah gambar kerja atau dokumen BQ</div>
      <div style={{ font: sans('400 12.5px/1.65'), color: color.muted, maxWidth: 430 }}>
        Tarik berkas ke sini, atau pilih dari komputer. PDF hasil ekspor AutoCAD, denah hasil
        pindai, spreadsheet BQ, dan RKS semuanya bisa dibaca. AI menyusun bill of quantities
        lengkap dengan build up harga satuan, lalu bisa diekspor ke Excel dan PDF.
      </div>

      <label
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          width: '100%',
          maxWidth: 430,
          marginTop: 6,
          textAlign: 'left',
        }}
      >
        <span style={{ font: sans('500 11.5px'), color: color.muted }}>
          Konteks tambahan (opsional)
        </span>
        <input
          value={hint}
          onChange={(e) => onHint(e.target.value)}
          placeholder="mis. rumah 2 lantai tipe 5×12, struktur beton, atap baja ringan"
          style={{
            border: `1px solid ${color.border}`,
            borderRadius: 7,
            padding: '9px 11px',
            font: sans('400 12px'),
            color: color.ink,
            background: color.surfaceSoft,
          }}
        />
      </label>

      <button
        type="button"
        className="btn-primary"
        onClick={onPick}
        style={{ ...btnPrimary, marginTop: 4, padding: '10px 20px', font: sans('500 12.5px') }}
      >
        Pilih berkas
      </button>
      <div style={{ font: mono('400 10.5px'), color: color.faint }}>
        PDF · XLSX · XLS · CSV · JPG · PNG — bisa lebih dari satu berkas
      </div>
      <div style={{ font: mono('400 10.5px'), color: color.faint }}>
        basis harga {priceBasis.label} · berlaku {priceBasis.effectiveFrom}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- working */

const STEPS: { stage: Stage; label: string; meta: string }[] = [
  { stage: 'reading', label: 'Membaca dokumen', meta: 'teks / OCR' },
  { stage: 'thinking', label: 'Menyusun item & volume', meta: 'AI' },
]

function Working({ stage, message }: { stage: Stage; message: string }) {
  const stateOf = (step: Stage): StepState => {
    const order: Stage[] = ['reading', 'thinking']
    const at = order.indexOf(stage)
    const mine = order.indexOf(step)
    return mine < at ? 'done' : mine === at ? 'active' : 'idle'
  }

  return (
    <div style={{ ...card, padding: '34px 30px', maxWidth: 620, margin: '0 auto' }}>
      <div style={{ font: sans('600 13.5px'), marginBottom: 5 }}>Menyusun build up cost</div>
      <div style={{ font: mono('400 11.5px'), color: color.faint, marginBottom: 22 }}>
        {message || 'menunggu…'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        {STEPS.map((step) => (
          <ProgressStep
            key={step.label}
            state={stateOf(step.stage)}
            label={step.label}
            meta={step.meta}
            progress={stateOf(step.stage) === 'active' ? 70 : undefined}
          />
        ))}
        <ProgressStep state="idle" label="Menghitung rate, subtotal & total" meta="lokal" />
      </div>
      <div style={{ font: sans('400 11.5px/1.6'), color: color.muted, marginTop: 22 }}>
        Gambar kerja yang tebal bisa memakan satu sampai dua menit. Halaman ini boleh ditinggal
        terbuka.
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- toolbar */

function Toolbar({
  doc,
  busy,
  onMarkup,
  onAdd,
}: {
  doc: BuildUpDoc
  busy: boolean
  onMarkup: (patch: { profitPct?: number | null; wastePct?: number | null }) => void
  onAdd: () => void
}) {
  const markup = doc.markup ?? inferMarkup(doc)
  const [exporting, setExporting] = useState(false)

  const runXlsx = async () => {
    setExporting(true)
    try {
      await exportBuildUpXlsx(doc)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div
      style={{
        ...card,
        padding: '12px 15px',
        margin: '14px 0 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
      }}
    >
      <Percent
        label="Profit & overhead"
        value={markup.profitPct}
        onChange={(v) => onMarkup({ profitPct: v })}
      />
      <Percent
        label="Waste"
        value={markup.wastePct}
        onChange={(v) => onMarkup({ wastePct: v })}
      />
      <span style={{ font: mono('400 10.5px'), color: color.faint, maxWidth: 210, lineHeight: 1.5 }}>
        dihitung dari kolom supply, bill langsung dihitung ulang · kosong = ikut angka per baris
      </span>

      <div style={{ flex: 1 }} />

      <button type="button" className="btn-ghost" style={btnGhost} onClick={onAdd} disabled={busy}>
        + Dokumen lain
      </button>
      <button
        type="button"
        className="btn-primary"
        style={btnPrimary}
        onClick={() => void runXlsx()}
        disabled={exporting}
      >
        {exporting ? 'Menyiapkan…' : '⤓ Excel (.xlsx)'}
      </button>
      <button
        type="button"
        className="btn-ghost"
        style={btnGhost}
        onClick={() => exportBuildUpPdf(doc)}
      >
        ⤓ PDF
      </button>
      <button
        type="button"
        className="btn-ghost"
        style={btnGhost}
        onClick={() => exportBuildUpCsv(doc)}
      >
        ⤓ CSV
      </button>
      <button
        type="button"
        className="btn-ghost"
        style={btnGhost}
        onClick={() => exportBuildUpJson(doc)}
      >
        ⤓ JSON
      </button>
    </div>
  )
}

function Percent({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ font: sans('500 10.5px'), color: color.muted }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={value ?? ''}
          placeholder="—"
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          style={{
            width: 66,
            border: `1px solid ${color.border}`,
            borderRadius: 6,
            padding: '6px 8px',
            font: mono('500 12px'),
            color: color.ink,
            background: color.surfaceSoft,
          }}
        />
        <span style={{ font: mono('400 11px'), color: color.faint }}>%</span>
      </span>
    </label>
  )
}
