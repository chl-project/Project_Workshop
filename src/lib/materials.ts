import type { MaterialRow, MaterialStatus, SpecData } from '@/types'

/** Client for reading material rows out of an uploaded document. */

const STATUS_LABELS: Record<MaterialStatus, string> = {
  clear: 'Jelas ✓',
  ambiguous: 'Ambigu ⚠',
  overspec: 'Over-spec ⚠',
  unavailable: 'Tidak tersedia ✕',
}

export interface ExtractedMaterial {
  division: string
  item: string
  spec: string
  standard: string
  volume: string
  status: MaterialStatus
}

/** Sends document text to the server and returns the rows it recognised. */
export async function extractMaterials(
  filename: string,
  text: string,
): Promise<ExtractedMaterial[]> {
  const res = await fetch('/api/extract-materials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, text }),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Gagal membaca dokumen (${res.status})`)
  }
  const body = (await res.json()) as { materials?: ExtractedMaterial[] }
  return body.materials ?? []
}

/** Identity used to recognise a row already present in the table. */
const keyOf = (division: string, item: string) =>
  `${division}|${item}`.toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * Merges extracted rows into the spec table. Rows already in the table are
 * skipped rather than duplicated, so re-uploading a revised document adds only
 * what is new. Counts are recomputed so the header and footer stay truthful.
 */
export function mergeMaterials(
  data: SpecData,
  incoming: ExtractedMaterial[],
  documentName?: string,
): { data: SpecData; added: number; skipped: number } {
  const seen = new Set(data.materials.map((m) => keyOf(m.division, m.item)))

  const fresh: MaterialRow[] = []
  let skipped = 0
  for (const row of incoming) {
    const key = keyOf(row.division, row.item)
    if (seen.has(key)) {
      skipped++
      continue
    }
    seen.add(key)
    fresh.push({
      id: `x-${key.replace(/[^a-z0-9]+/g, '-')}-${fresh.length}`,
      division: row.division,
      item: row.item,
      spec: row.spec,
      standard: row.standard,
      volume: row.volume,
      status: row.status,
      statusLabel: STATUS_LABELS[row.status],
    })
  }

  const materials = [...data.materials, ...fresh]
  const documents =
    documentName && !data.documents.includes(documentName)
      ? [...data.documents, documentName]
      : data.documents

  return {
    data: {
      ...data,
      documents,
      materials,
      // The fixture's itemCount describes a larger source table than the rows it
      // ships. Keep it while the table is still the sample, but once rows from a
      // real document land, report the count actually held — otherwise the
      // footer reads "4 dari 128".
      itemCount: fresh.length > 0 ? materials.length : data.itemCount,
      shownCount: materials.length,
      divisionCount: new Set(materials.map((m) => m.division)).size,
    },
    added: fresh.length,
    skipped,
  }
}
