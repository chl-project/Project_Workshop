import { useEffect, useRef, useState } from 'react'
import {
  emptyState,
  fetchSpesifikasi,
  keys,
  listDocuments,
  parseHeader,
  parseSpecDocuments,
  parseSteps,
  partialError,
  isSampleProject,
  saveResource,
  uploadDocument,
} from '@/api'
import { isSupportedFile } from '@/lib/extract'
import { readDocument } from '@/lib/ocr'
import { extractMaterials, mergeMaterials } from '@/lib/materials'
import {
  Chip,
  ErrorPanel,
  LoadingPanel,
  ProgressStep,
  Segmented,
} from '@/components/primitives'
import { downloadExcel } from '@/lib/export'
import { useResource } from '@/hooks/useResource'
import { useViewport } from '@/hooks/useViewport'
import { btnPrimary, card, cardClipped, screenSub, screenTitle, scrollX, splitGrid, table, th, theadRow, type ChipTone } from '@/theme/styles'
import { color, mono, sans } from '@/theme/tokens'
import type { MaterialRow, MaterialStatus, ScreenId, SpecData, SpecScreenState } from '@/types'

const stateLabels = { full: 'Terisi', empty: 'Kosong', load: 'Memproses', err: 'Parsial' } as const
type StateLabel = (typeof stateLabels)[keyof typeof stateLabels]

const labelToState: Record<StateLabel, SpecScreenState> = {
  Terisi: 'full',
  Kosong: 'empty',
  Memproses: 'load',
  Parsial: 'err',
}

const rowTint: Record<MaterialStatus, { bg?: string; hover: string }> = {
  clear: { hover: 'row-hover' },
  ambiguous: { bg: color.amberRow, hover: 'row-hover-amber' },
  overspec: { bg: color.amberRow, hover: 'row-hover-amber' },
  unavailable: { bg: color.redRow, hover: 'row-hover-red' },
}

const statusTone: Record<MaterialStatus, ChipTone> = {
  clear: 'green',
  ambiguous: 'amber',
  overspec: 'amber',
  unavailable: 'red',
}

/**
 * What a project with no data yet starts from. This screen is where a project
 * gets populated, so it has to render its upload controls even with nothing in
 * it — an empty-state panel here would be a dead end.
 */
const EMPTY_SPEC: SpecData = {
  documents: [],
  projectClasses: ['Subsidi', 'Menengah', 'Premium'],
  activeClass: 'Menengah',
  itemCount: 0,
  divisionCount: 0,
  shownCount: 0,
  materials: [],
  findings: [],
  openFindings: 0,
  alternativesFor: '',
  alternatives: [],
}

export function Spesifikasi({
  projectId,
  onNavigate,
}: {
  projectId: string
  onNavigate: (s: ScreenId) => void
}) {
  const { data, loading, error } = useResource<SpecData>(keys.spesifikasi(projectId), () =>
    fetchSpesifikasi(projectId),
  )
  const [screenState, setScreenState] = useState<SpecScreenState>('full')
  const parseJob = useRef(0)

  /** Kick off a (mock) parse run; the UI shows step progress until it resolves. */
  useEffect(() => {
    if (screenState !== 'load') return
    const job = ++parseJob.current
    let alive = true
    parseSpecDocuments(projectId).then(() => {
      if (alive && parseJob.current === job) setScreenState('full')
    })
    return () => {
      alive = false
    }
  }, [screenState, projectId])

  const cancelParse = () => {
    parseJob.current++
    setScreenState('full')
  }

  const isSample = isSampleProject(projectId)
  // A real project has no fixture, so `data` is null until it has been filled.
  const spec = data ?? (loading ? null : EMPTY_SPEC)
  const showTable = screenState === 'full' || screenState === 'err'

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20,
          marginBottom: 18,
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <div style={screenTitle}>Spesifikasi &amp; Material</div>
          <div style={screenSub}>
            Spesifikasi dan material yang diminta itu sebenarnya apa, wajar tidak, dan ada
            alternatifnya tidak?
          </div>
        </div>
        <div
          style={{
            display: isSample ? 'flex' : 'none',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 6,
            background: color.segmentTrack,
            borderRadius: 8,
            padding: 3,
          }}
        >
          {(Object.values(stateLabels) as StateLabel[]).map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setScreenState(labelToState[label])}
              style={{
                border: 0,
                cursor: 'pointer',
                borderRadius: 6,
                padding: '6px 11px',
                font: mono('500 11px'),
                color: color.ink,
                background: stateLabels[screenState] === label ? color.surface : 'transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <LoadingPanel />}
      {error && <ErrorPanel error={error} />}

      {screenState === 'empty' && <EmptyState onUpload={() => setScreenState('load')} />}

      {screenState === 'load' && <ParsingState onCancel={cancelParse} />}

      {screenState === 'err' && (
        <PartialBanner onRetry={() => setScreenState('load')} onContinue={() => setScreenState('full')} />
      )}

      {showTable && spec && (
        <SpecTable data={spec} projectId={projectId} onNavigate={onNavigate} />
      )}
    </>
  )
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div
      style={{
        ...card,
        padding: '64px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        textAlign: 'center',
      }}
    >
      <svg width="150" height="96" viewBox="0 0 150 96" role="img" aria-label="Placeholder dokumen">
        <defs>
          <pattern
            id="stripe-empty"
            width="7"
            height="7"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <rect width="3.2" height="7" fill="#E9E9E1" />
          </pattern>
        </defs>
        <rect x="30" y="6" width="66" height="84" rx="4" fill="url(#stripe-empty)" stroke="#DCDCD3" />
        <rect x="54" y="24" width="66" height="60" rx="4" fill="#FFFFFF" stroke="#DCDCD3" />
        <rect x="64" y="38" width="46" height="4" rx="2" fill="#E4E4DE" />
        <rect x="64" y="50" width="36" height="4" rx="2" fill="#E4E4DE" />
        <rect x="64" y="62" width="42" height="4" rx="2" fill="#E4E4DE" />
      </svg>
      <div style={{ font: sans('600 14px') }}>{emptyState.title}</div>
      <div style={{ font: sans('400 12.5px/1.6'), color: color.muted, maxWidth: 340 }}>
        {emptyState.body}
      </div>
      <button
        type="button"
        className="btn-primary"
        onClick={onUpload}
        style={{ ...btnPrimary, marginTop: 4, padding: '9px 18px', font: sans('500 12.5px') }}
      >
        {emptyState.cta}
      </button>
    </div>
  )
}

function ParsingState({ onCancel }: { onCancel: () => void }) {
  return (
    <div style={{ ...card, padding: '40px 32px', maxWidth: 620, margin: '0 auto' }}>
      <div style={{ font: sans('600 13.5px'), marginBottom: 5 }}>{parseHeader.title}</div>
      <div style={{ font: mono('400 11.5px'), color: color.faint, marginBottom: 22 }}>
        {parseHeader.meta}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        {parseSteps.map((step) => (
          <ProgressStep
            key={step.label}
            state={step.state}
            label={step.label}
            meta={step.meta}
            progress={'progress' in step ? step.progress : undefined}
          />
        ))}
      </div>
      <button
        type="button"
        className="btn-ghost"
        onClick={onCancel}
        style={{
          marginTop: 26,
          border: `1px solid ${color.border}`,
          background: color.surfaceSoft,
          cursor: 'pointer',
          borderRadius: 7,
          padding: '8px 15px',
          font: sans('500 12px'),
          color: color.muted,
        }}
      >
        Batalkan proses
      </button>
    </div>
  )
}

function PartialBanner({ onRetry, onContinue }: { onRetry: () => void; onContinue: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        background: color.redPanelBg,
        border: `1px solid ${color.redPanelBorder}`,
        borderRadius: 10,
        padding: '15px 17px',
        marginBottom: 16,
      }}
    >
      <span style={{ font: mono('500 13px'), color: color.red, marginTop: 1 }}>!</span>
      <div style={{ flex: 1 }}>
        <div style={{ font: sans('600 12.5px'), color: color.redText }}>{partialError.title}</div>
        <div style={{ font: sans('400 12px/1.6'), color: color.redPanelText, marginTop: 4 }}>
          {partialError.body}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
          <button
            type="button"
            onClick={onRetry}
            style={{
              border: 0,
              cursor: 'pointer',
              background: color.red,
              color: color.surface,
              borderRadius: 6,
              padding: '7px 14px',
              font: sans('500 12px'),
            }}
          >
            Coba lagi halaman gagal
          </button>
          <button
            type="button"
            onClick={onContinue}
            style={{
              border: `1px solid ${color.redPanelBorder}`,
              cursor: 'pointer',
              background: 'transparent',
              color: color.redText,
              borderRadius: 6,
              padding: '7px 14px',
              font: sans('500 12px'),
            }}
          >
            Lanjut dengan hasil parsial
          </button>
        </div>
      </div>
    </div>
  )
}

function SpecTable({
  data,
  projectId,
  onNavigate,
}: {
  data: SpecData
  projectId: string
  onNavigate: (s: ScreenId) => void
}) {
  const { isCompact } = useViewport()
  const fileInput = useRef<HTMLInputElement>(null)
  /* The table renders from local state so rows read out of an uploaded
     document appear immediately; it re-syncs whenever the endpoint reloads. */
  const [spec, setSpec] = useState<SpecData>(data)
  const [docs, setDocs] = useState<string[]>(data.documents)
  const [uploading, setUploading] = useState(false)
  const [busyLabel, setBusyLabel] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadNote, setUploadNote] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MaterialStatus | 'all'>('all')
  const [showFilter, setShowFilter] = useState(false)
  const [activeClass, setActiveClass] = useState(data.activeClass)

  useEffect(() => {
    setSpec(data)
    setDocs(data.documents)
  }, [data])

  const q = search.trim().toLowerCase()
  const filtered = spec.materials.filter(
    (r) =>
      (statusFilter === 'all' || r.status === statusFilter) &&
      (q === '' ||
        [r.division, r.item, r.spec, r.standard].some((v) => v.toLowerCase().includes(q))),
  )

  const statusOptions: { value: MaterialStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'Semua status' },
    { value: 'clear', label: 'Jelas' },
    { value: 'ambiguous', label: 'Ambigu' },
    { value: 'overspec', label: 'Overspec' },
    { value: 'unavailable', label: 'Tidak tersedia' },
  ]
  const activeFilterLabel = statusOptions.find((o) => o.value === statusFilter)?.label

  const exportExcel = () =>
    downloadExcel(
      'spesifikasi-material',
      'Spesifikasi & Material',
      ['Divisi', 'Item', 'Spesifikasi', 'Standar', 'Volume', 'Status'],
      filtered.map((r) => [r.division, r.item, r.spec, r.standard, r.volume, r.statusLabel]),
    )

  // Merge any documents already uploaded to Blob for this project.
  useEffect(() => {
    let alive = true
    listDocuments(projectId).then((records) => {
      if (!alive || records.length === 0) return
      setDocs((prev) => {
        const merged = new Set(prev)
        for (const r of records) merged.add(r.name)
        return [...merged]
      })
    })
    return () => {
      alive = false
    }
  }, [projectId])

  /**
   * Stores the file, then reads its material rows into the table. The two are
   * kept separate on purpose: a document that yields no rows (a drawing, an
   * unreadable scan) is still uploaded, and only the reading step reports why.
   */
  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadError(null)
    setUploadNote(null)

    let current = spec
    const notes: string[] = []
    const problems: string[] = []

    for (const file of Array.from(files)) {
      try {
        setBusyLabel(`Mengunggah ${file.name}…`)
        const record = await uploadDocument(projectId, file)
        setDocs((prev) => (prev.includes(record.name) ? prev : [...prev, record.name]))

        if (!isSupportedFile(file.name)) {
          problems.push(`${file.name}: tersimpan, tapi isinya belum bisa dibaca otomatis.`)
          continue
        }

        // Scanned PDFs go through OCR here; progress is surfaced per page batch
        // because that step is slow enough to look stuck otherwise.
        const read = await readDocument(file, setBusyLabel)

        setBusyLabel(`Menyusun data dari ${file.name}…`)
        const rows = await extractMaterials(file.name, read.text)
        if (rows.length === 0) {
          // Show what was actually read, so an extraction problem is
          // distinguishable from a document that holds no material list.
          const preview = read.text.replace(/\s+/g, ' ').slice(0, 140)
          problems.push(
            `${file.name}: tidak ditemukan daftar material. Yang terbaca: "${preview}${
              read.text.length > 140 ? '…' : ''
            }"`,
          )
          continue
        }

        const merged = mergeMaterials(current, rows, file.name)
        current = merged.data
        setSpec(current)
        notes.push(
          `${file.name}: ${merged.added} item masuk` +
            (merged.skipped ? ` · ${merged.skipped} sudah ada` : '') +
            (read.ocr ? ' · dibaca via OCR' : '') +
            (read.note ? ` · ${read.note}` : ''),
        )
      } catch (err) {
        problems.push(`${file.name}: ${err instanceof Error ? err.message : 'gagal diproses'}`)
      }
    }

    // Persist once, after every file in the batch has been folded in.
    if (notes.length > 0) {
      try {
        await saveResource(keys.spesifikasi(projectId), current)
      } catch {
        problems.push('Data tampil di layar tapi gagal disimpan ke database.')
      }
    }

    setUploadNote(notes.join(' · ') || null)
    setUploadError(problems.join(' · ') || null)
    setBusyLabel(null)
    setUploading(false)
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
          ...card,
          padding: '13px 15px',
          marginBottom: 16,
        }}
      >
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.xlsm,.ods,.csv,.txt,.md"
          onChange={(e) => void onFiles(e.target.files)}
        />
        <button
          type="button"
          className="btn-primary"
          style={{ ...btnPrimary, flex: 'none', opacity: uploading ? 0.6 : 1 }}
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
        >
          {busyLabel ?? '＋ Upload dokumen'}
        </button>
        <div
          style={{
            display: 'flex',
            gap: 7,
            flexWrap: 'wrap',
            font: mono('400 11px'),
            color: color.muted,
          }}
        >
          {docs.map((doc) => (
            <span
              key={doc}
              style={{ border: `1px solid ${color.border}`, borderRadius: 5, padding: '5px 9px' }}
            >
              {doc}
            </span>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ font: sans('500 11px'), color: color.muted, whiteSpace: 'nowrap' }}>
          Kelas proyek
        </span>
        <Segmented options={spec.projectClasses} value={activeClass} onChange={setActiveClass} />
        {uploadNote && (
          <div
            style={{
              flexBasis: '100%',
              background: color.greenTint,
              border: `1px solid ${color.greenLine}`,
              borderRadius: 7,
              padding: '9px 11px',
              font: sans('400 11.5px/1.55'),
              color: color.greenText,
            }}
          >
            {uploadNote}
          </div>
        )}
        {uploadError && (
          <div
            style={{
              flexBasis: '100%',
              background: color.redPanelBg,
              border: `1px solid ${color.redPanelBorder}`,
              borderRadius: 7,
              padding: '9px 11px',
              font: sans('400 11.5px/1.55'),
              color: color.redPanelText,
            }}
          >
            {uploadError}
          </div>
        )}
      </div>

      <div style={splitGrid(320, isCompact)}>
        <div style={cardClipped}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              padding: '12px 15px',
              borderBottom: `1px solid ${color.borderSoft}`,
            }}
          >
            <div style={{ font: sans('600 12.5px') }}>Material terstruktur</div>
            <span style={{ font: mono('400 11px'), color: color.faint }}>
              {spec.itemCount} item · {spec.divisionCount} divisi
            </span>
            <div style={{ flex: 1 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari item…"
              aria-label="Cari item"
              style={{
                font: mono('400 11px'),
                color: color.ink,
                border: `1px solid ${color.border}`,
                borderRadius: 5,
                padding: '5px 9px',
                width: 130,
                background: color.surface,
                outline: 'none',
              }}
            />
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowFilter((v) => !v)}
                style={{ ...pillBtn, background: color.surface, cursor: 'pointer' }}
              >
                {statusFilter === 'all' ? 'Filter ▾' : `${activeFilterLabel} ✕`}
              </button>
              {showFilter && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    zIndex: 20,
                    background: color.surface,
                    border: `1px solid ${color.border}`,
                    borderRadius: 7,
                    boxShadow: '0 8px 24px rgba(0,0,0,.12)',
                    padding: 5,
                    minWidth: 150,
                  }}
                >
                  {statusOptions.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(o.value)
                        setShowFilter(false)
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        border: 0,
                        cursor: 'pointer',
                        borderRadius: 5,
                        padding: '6px 9px',
                        font: sans('500 11.5px'),
                        color: color.ink,
                        background: o.value === statusFilter ? color.greenTint : 'transparent',
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={exportExcel}
              style={{
                font: sans('500 11px'),
                color: color.green,
                border: `1px solid ${color.greenLine}`,
                borderRadius: 5,
                padding: '5px 9px',
                background: color.greenTint,
                cursor: 'pointer',
              }}
            >
              Ekspor Excel
            </button>
          </div>

          <div style={scrollX}>
            <table style={table}>
              <thead>
                <tr style={theadRow}>
                  <th style={th({ padding: '9px 14px' })}>DIVISI</th>
                  <th style={th()}>ITEM</th>
                  <th style={th()}>SPESIFIKASI</th>
                  <th style={th()}>STANDAR</th>
                  <th style={th({ textAlign: 'right' })}>VOLUME</th>
                  <th style={th({ padding: '9px 14px' })}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: '34px 16px',
                        textAlign: 'center',
                        font: sans('400 12px/1.65'),
                        color: color.muted,
                      }}
                    >
                      {spec.materials.length === 0
                        ? 'Belum ada material. Unggah RKS atau daftar material lewat tombol “Upload dokumen” di atas — isinya akan dibaca dan masuk ke tabel ini.'
                        : 'Tidak ada item yang cocok dengan pencarian atau filter.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => <MaterialTr key={row.id} row={row} />)
                )}
              </tbody>
            </table>
          </div>
          <div
            style={{
              padding: '11px 15px',
              borderTop: `1px solid ${color.borderSoft}`,
              font: mono('400 11px'),
              color: color.faint,
            }}
          >
            Menampilkan {filtered.length} dari {spec.itemCount} item
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {spec.findings.length > 0 && (
          <div style={cardClipped}>
            <div
              style={{
                padding: '12px 15px',
                borderBottom: `1px solid ${color.borderSoft}`,
                font: sans('600 12.5px'),
              }}
            >
              Temuan{' '}
              <span style={{ font: mono('400 11px'), color: color.faint }}>
                {data.openFindings} terbuka
              </span>
            </div>
            {data.findings.map((f, i) => (
              <div
                key={f.title}
                style={{
                  padding: '12px 15px',
                  borderBottom:
                    i === data.findings.length - 1 ? undefined : `1px solid ${color.rowLine}`,
                }}
              >
                <div style={{ font: sans('500 12px/1.45') }}>{f.title}</div>
                <div style={{ font: sans('400 11.5px/1.55'), color: color.muted, marginTop: 3 }}>
                  {f.body}
                </div>
              </div>
            ))}
          </div>
          )}

          {spec.alternatives.length > 0 && (
          <div style={cardClipped}>
            <div style={{ padding: '12px 15px', borderBottom: `1px solid ${color.borderSoft}` }}>
              <div style={{ font: sans('600 12.5px') }}>Alternatif material</div>
              <div style={{ font: mono('400 11px'), color: color.faint, marginTop: 3 }}>
                {data.alternativesFor}
              </div>
            </div>
            {data.alternatives.map((alt) => (
              <div
                key={alt.name}
                style={{
                  padding: '12px 15px',
                  borderBottom: `1px solid ${color.rowLine}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ font: sans('500 12px') }}>{alt.name}</span>
                  <span style={{ font: mono('600 12px'), color: color.greenOk }}>{alt.delta}</span>
                </div>
                <div style={{ font: mono('400 11px/1.5'), color: color.faint }}>{alt.availability}</div>
                <div style={{ font: sans('400 11.5px/1.5'), color: color.muted }}>{alt.note}</div>
              </div>
            ))}
            <div style={{ padding: '12px 15px' }}>
              <button
                type="button"
                className="btn-tint"
                onClick={() => onNavigate('cost')}
                style={{
                  width: '100%',
                  border: `1px solid ${color.greenLine}`,
                  background: color.greenTint,
                  color: color.green,
                  borderRadius: 7,
                  padding: 8,
                  cursor: 'pointer',
                  font: sans('500 12px'),
                }}
              >
                Kirim ke VE →
              </button>
            </div>
          </div>
          )}
        </div>
      </div>
    </>
  )
}

function MaterialTr({ row }: { row: MaterialRow }) {
  const tint = rowTint[row.status]
  return (
    <tr
      className={tint.hover}
      style={{ borderBottom: `1px solid ${color.rowLine}`, background: tint.bg }}
    >
      <td style={{ padding: '10px 14px', color: color.muted }}>{row.division}</td>
      <td style={{ padding: '10px 8px', fontWeight: 500 }}>{row.item}</td>
      <td style={{ padding: '10px 8px', color: color.inkSoft }}>{row.spec}</td>
      <td style={{ padding: '10px 8px', font: mono('400 11px'), color: color.faint }}>
        {row.standard}
      </td>
      <td style={{ padding: '10px 8px', textAlign: 'right', font: mono('500 12px') }}>{row.volume}</td>
      <td style={{ padding: '10px 14px' }}>
        <Chip tone={statusTone[row.status]}>{row.statusLabel}</Chip>
      </td>
    </tr>
  )
}

const pillBtn = {
  font: mono('400 11px'),
  color: color.muted,
  border: `1px solid ${color.border}`,
  borderRadius: 5,
  padding: '5px 9px',
} as const
