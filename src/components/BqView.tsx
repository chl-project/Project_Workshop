import { useState } from 'react'
import { countItems, formatIdr, formatQty, formatShort } from '@/lib/buildup'
import { Segmented } from '@/components/primitives'
import { card, cardClipped, table, th, theadRow, vRule } from '@/theme/styles'
import { color, mono, sans } from '@/theme/tokens'
import type { BqSection, BuildUpDoc } from '@/types'

/**
 * Renders a generated bill of quantities.
 *
 * The bill is shown the way it is printed — sections in reference order, the
 * description-only headings kept in place above the items they govern, and the
 * subtotal sitting in the Rate column. The build-up columns (supply,
 * accessories, profit, waste, labour) are what separate this from a flat price
 * list, so they stay visible rather than collapsing into a single rate.
 */

const TABS = ['Bill of Quantities', 'Rekap', 'AHS', 'Asumsi'] as const
type Tab = (typeof TABS)[number]

export function BqView({ doc }: { doc: BuildUpDoc }) {
  const [tab, setTab] = useState<Tab>('Bill of Quantities')
  const tabs = TABS.filter((t) => (t === 'AHS' ? doc.ahs.length > 0 : true))

  return (
    <>
      <SummaryStrip doc={doc} />

      <div style={{ margin: '16px 0 12px' }}>
        <Segmented options={tabs} value={tab} onChange={setTab} />
      </div>

      {tab === 'Bill of Quantities' && <BillTables doc={doc} />}
      {tab === 'Rekap' && <Collection doc={doc} />}
      {tab === 'AHS' && <AhsTables doc={doc} />}
      {tab === 'Asumsi' && <Assumptions doc={doc} />}
    </>
  )
}

function SummaryStrip({ doc }: { doc: BuildUpDoc }) {
  const perM2 = doc.areaM2 ? doc.grandTotal / doc.areaM2 : null

  return (
    <div style={{ ...card, padding: '18px 22px' }}>
      <div style={{ display: 'flex', gap: 30, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: sans('500 11px'), color: color.muted }}>Total {doc.currency}</div>
          <div style={{ font: mono('600 34px/1.1'), letterSpacing: '-.03em', marginTop: 6 }}>
            {formatShort(doc.grandTotal)}
          </div>
          <div style={{ font: mono('400 11.5px'), color: color.faint, marginTop: 5 }}>
            {doc.currency} {formatIdr(doc.grandTotal)}
          </div>
        </div>
        <div style={vRule} />
        {perM2 != null && (
          <>
            <div>
              <div style={{ font: sans('500 11px'), color: color.muted }}>Cost per m²</div>
              <div style={{ font: mono('600 34px/1.1'), letterSpacing: '-.03em', marginTop: 6 }}>
                {formatShort(perM2)}
              </div>
              <div style={{ font: mono('400 11.5px'), color: color.faint, marginTop: 5 }}>
                luas {formatQty(doc.areaM2)} m²
              </div>
            </div>
            <div style={vRule} />
          </>
        )}
        <div style={{ font: mono('400 11.5px/1.9'), color: color.muted }}>
          {doc.sections.length} seksi · {countItems(doc)} item terukur
          <br />
          sumber <span style={{ color: color.ink }}>{doc.sources.join(', ') || '—'}</span>
          <br />
          dibaca {doc.ocr ? 'lewat OCR' : 'dari layer teks'} ·{' '}
          {new Date(doc.generatedAt).toLocaleString('id-ID')}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- bill */

function BillTables({ doc }: { doc: BuildUpDoc }) {
  // The first two sections open by default, as in the BQ / RAB screen.
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(doc.sections.map((s, i) => [s.ref, i < 2])),
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {doc.sections.map((section) => (
        <SectionCard
          key={section.ref}
          section={section}
          currency={doc.currency}
          open={open[section.ref] ?? false}
          onToggle={() => setOpen((prev) => ({ ...prev, [section.ref]: !prev[section.ref] }))}
        />
      ))}

      <div
        style={{
          ...card,
          background: color.sidebarDark,
          border: 0,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ font: sans('600 13px'), color: color.onDark }}>{doc.grandTotalLabel}</span>
        <div style={{ flex: 1 }} />
        <span style={{ font: mono('600 17px'), color: color.onDark }}>
          {doc.currency} {formatIdr(doc.grandTotal)}
        </span>
      </div>
    </div>
  )
}

function SectionCard({
  section,
  currency,
  open,
  onToggle,
}: {
  section: BqSection
  currency: string
  open: boolean
  onToggle: () => void
}) {
  const items = section.lines.filter((l) => l.kind === 'item')

  return (
    <div style={cardClipped}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          border: 0,
          background: color.surfaceMuted,
          cursor: 'pointer',
          padding: '11px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          textAlign: 'left',
          borderBottom: open ? `1px solid ${color.borderSoft}` : undefined,
        }}
      >
        <span style={{ font: mono('500 11px'), color: color.muted, width: 18 }}>
          {open ? '▾' : '▸'}
        </span>
        <span style={{ font: mono('500 11.5px'), color: color.green, width: 26 }}>
          {section.ref}
        </span>
        <span style={{ font: sans('600 12.5px') }}>{section.title}</span>
        <span style={{ font: mono('400 11px'), color: color.faint }}>{items.length} item</span>
        <div style={{ flex: 1 }} />
        <span style={{ font: mono('600 12.5px') }}>
          {section.subtotalNote ? (
            <span style={{ font: mono('400 11px'), color: color.faint }}>
              {section.subtotalNote}
            </span>
          ) : (
            `${currency} ${formatIdr(section.subtotal)}`
          )}
        </span>
      </button>

      {open && section.lines.length === 0 && (
        <div style={{ padding: '14px 16px', font: sans('400 12px/1.6'), color: color.muted }}>
          Tidak ada item terukur pada seksi ini
          {section.subtotalNote ? ` — ${section.subtotalNote}.` : '.'}
        </div>
      )}

      {open && section.lines.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ ...table, minWidth: 940 }}>
            <thead>
              <tr style={theadRow}>
                <th style={th({ padding: '9px 16px', minWidth: 280 })}>DESCRIPTION</th>
                <th style={th({ textAlign: 'center' })}>UNIT</th>
                <th style={th({ textAlign: 'right' })}>QTTY</th>
                <th style={th({ textAlign: 'right' })}>SUPPLY</th>
                <th style={th({ textAlign: 'right' })}>ACC.</th>
                <th style={th({ textAlign: 'right' })}>PROFIT</th>
                <th style={th({ textAlign: 'right' })}>WASTE</th>
                <th style={th({ textAlign: 'right' })}>LABOUR</th>
                <th style={th({ textAlign: 'right' })}>RATE</th>
                <th style={th({ textAlign: 'right', padding: '9px 16px' })}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {section.lines.map((line, i) =>
                line.kind === 'heading' ? (
                  <tr key={i} style={{ background: color.surfaceSoft }}>
                    <td
                      colSpan={10}
                      style={{
                        padding: '9px 16px',
                        font: sans('500 12px/1.5'),
                        color: color.inkSoft,
                      }}
                    >
                      {line.description}
                    </td>
                  </tr>
                ) : (
                  <tr key={i} style={{ borderBottom: `1px solid ${color.rowLine}` }}>
                    <td style={{ padding: '8px 16px', lineHeight: 1.5 }}>{line.description}</td>
                    <td style={{ padding: '8px', textAlign: 'center', font: mono('400 11px') }}>
                      {line.unit}
                    </td>
                    <Num value={formatQty(line.qty)} />
                    <Num value={formatIdr(line.supply)} />
                    <Num value={formatIdr(line.accessories)} faint />
                    <Num value={formatIdr(line.profit)} faint />
                    <Num value={formatIdr(line.waste)} faint />
                    <Num value={formatIdr(line.labour)} faint />
                    <Num value={formatIdr(line.rate)} />
                    <td
                      style={{
                        padding: '8px 16px',
                        textAlign: 'right',
                        font: mono(line.note ? '400 11px' : '500 12px'),
                        color: line.note ? color.faint : undefined,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {line.note ?? formatIdr(line.amount)}
                    </td>
                  </tr>
                ),
              )}
              <tr style={{ background: color.surfaceMuted, borderTop: `1px solid ${color.border}` }}>
                <td colSpan={9} style={{ padding: '10px 16px', fontWeight: 600 }}>
                  Subtotal {section.title}
                </td>
                <td
                  style={{
                    padding: '10px 16px',
                    textAlign: 'right',
                    font: mono('600 12.5px'),
                    whiteSpace: 'nowrap',
                  }}
                >
                  {section.subtotalNote ?? formatIdr(section.subtotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Num({ value, faint }: { value: string; faint?: boolean }) {
  return (
    <td
      style={{
        padding: '8px',
        textAlign: 'right',
        font: mono(faint ? '400 11px' : '500 11.5px'),
        color: faint ? color.faint : undefined,
        whiteSpace: 'nowrap',
      }}
    >
      {value}
    </td>
  )
}

/* ------------------------------------------------------------- collection */

function Collection({ doc }: { doc: BuildUpDoc }) {
  const measured = doc.sections.reduce((sum, s) => sum + s.subtotal, 0)

  return (
    <div style={cardClipped}>
      <div
        style={{
          padding: '13px 16px',
          borderBottom: `1px solid ${color.borderSoft}`,
          font: sans('600 12.5px'),
        }}
      >
        Collection — rekap per seksi
      </div>
      <table style={table}>
        <thead>
          <tr style={theadRow}>
            <th style={th({ padding: '9px 16px' })}>REF</th>
            <th style={th()}>SEKSI</th>
            <th style={th({ textAlign: 'right' })}>PORSI</th>
            <th style={th({ textAlign: 'right', padding: '9px 16px' })}>
              JUMLAH ({doc.currency})
            </th>
          </tr>
        </thead>
        <tbody>
          {doc.sections.map((section) => (
            <tr key={section.ref} style={{ borderBottom: `1px solid ${color.rowLine}` }}>
              <td style={{ padding: '10px 16px', font: mono('500 11.5px'), color: color.green }}>
                {section.ref}
              </td>
              <td style={{ padding: '10px 8px', fontWeight: 500 }}>{section.title}</td>
              <td style={{ padding: '10px 8px', textAlign: 'right', font: mono('400 11.5px') }}>
                {measured > 0 && !section.subtotalNote
                  ? `${((section.subtotal / measured) * 100).toFixed(1).replace('.', ',')}%`
                  : '—'}
              </td>
              <td style={{ padding: '10px 16px', textAlign: 'right', font: mono('500 12px') }}>
                {section.subtotalNote ?? formatIdr(section.subtotal)}
              </td>
            </tr>
          ))}
          {doc.preliminaries.map((prelim) => (
            <tr key={prelim.label} style={{ borderBottom: `1px solid ${color.rowLine}` }}>
              <td />
              <td style={{ padding: '10px 8px', color: color.muted }}>{prelim.label}</td>
              <td />
              <td style={{ padding: '10px 16px', textAlign: 'right', font: mono('500 12px') }}>
                {formatIdr(prelim.amount)}
              </td>
            </tr>
          ))}
          <tr style={{ background: color.surfaceMuted, borderTop: `1px solid ${color.border}` }}>
            <td />
            <td style={{ padding: '12px 8px', fontWeight: 600 }}>{doc.grandTotalLabel}</td>
            <td />
            <td style={{ padding: '12px 16px', textAlign: 'right', font: mono('600 13px') }}>
              {formatIdr(doc.grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/* -------------------------------------------------------------------- ahs */

function AhsTables({ doc }: { doc: BuildUpDoc }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ font: sans('400 12px/1.6'), color: color.muted, marginBottom: 2 }}>
        Analisa harga satuan yang mendasari kolom <em>Supply</em> di bill — koefisien bahan dan upah
        per satuan pekerjaan.
      </div>
      {doc.ahs.map((analysis) => (
        <div key={`${analysis.no}-${analysis.title}`} style={cardClipped}>
          <div
            style={{
              padding: '11px 16px',
              background: color.surfaceMuted,
              borderBottom: `1px solid ${color.borderSoft}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ font: mono('500 11.5px'), color: color.green, width: 22 }}>
              {analysis.no}
            </span>
            <span style={{ font: sans('600 12.5px') }}>{analysis.title}</span>
            <div style={{ flex: 1 }} />
            <span style={{ font: mono('600 12.5px') }}>{formatIdr(analysis.total)}</span>
          </div>
          <table style={table}>
            <thead>
              <tr>
                <th style={th({ padding: '9px 16px' })}>URAIAN</th>
                <th style={th({ textAlign: 'right' })}>VOL.</th>
                <th style={th({ textAlign: 'center' })}>SAT.</th>
                <th style={th({ textAlign: 'right' })}>HARGA SATUAN</th>
                <th style={th({ textAlign: 'right', padding: '9px 16px' })}>JUMLAH</th>
              </tr>
            </thead>
            <tbody>
              {analysis.rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${color.rowLine}` }}>
                  <td style={{ padding: '8px 16px' }}>{row.description}</td>
                  <Num value={formatQty(row.qty)} />
                  <td style={{ padding: '8px', textAlign: 'center', font: mono('400 11px') }}>
                    {row.unit}
                  </td>
                  <Num value={formatIdr(row.unitPrice)} />
                  <td
                    style={{
                      padding: '8px 16px',
                      textAlign: 'right',
                      font: mono('500 12px'),
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatIdr(row.total)}
                  </td>
                </tr>
              ))}
              <tr style={{ background: color.surfaceMuted }}>
                <td colSpan={4} style={{ padding: '9px 16px', fontWeight: 600 }}>
                  Jumlah
                </td>
                <td
                  style={{
                    padding: '9px 16px',
                    textAlign: 'right',
                    font: mono('600 12.5px'),
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatIdr(analysis.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------- assumptions */

function Assumptions({ doc }: { doc: BuildUpDoc }) {
  return (
    <div style={{ ...card, padding: '18px 20px' }}>
      <div style={{ font: sans('600 12.5px'), marginBottom: 4 }}>
        Dasar ukur dan asumsi yang dipakai
      </div>
      <div style={{ font: sans('400 11.5px/1.6'), color: color.muted, marginBottom: 14 }}>
        Volume di bill diturunkan dari gambar, bukan diukur ulang. Periksa daftar ini lebih dulu —
        di sinilah selisih terbesar biasanya muncul.
      </div>
      {doc.assumptions.length === 0 ? (
        <div style={{ font: sans('400 12px'), color: color.faint }}>
          AI tidak mencatat asumsi khusus untuk dokumen ini.
        </div>
      ) : (
        <ol style={{ margin: 0, paddingLeft: 20, font: sans('400 12px/1.85'), color: color.inkSoft }}>
          {doc.assumptions.map((assumption, i) => (
            <li key={i}>{assumption}</li>
          ))}
        </ol>
      )}
    </div>
  )
}
