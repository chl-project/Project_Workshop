/**
 * The price basis every figure in the app is quoted on.
 *
 * This used to be a label and nothing more: the sidebar said "AHSP 2026 · Jawa
 * Barat" while the sample figures were hand-written and the AI-generated bills
 * were priced from the model's own general notion of "harga Indonesia" — which
 * is where the low numbers came from. The basis now lives in one place, is
 * shown wherever a figure is, and is sent to the model so a generated bill is
 * priced against the same anchors as the rest of the app.
 *
 * Honest about what this is: the anchors below are **indicative market rates**,
 * restated from the negotiated bill in `Bill No.2 — Phs 1 (Rev Nego 18 Des '24,
 * PT.AM)` and escalated to a DKI Jakarta 2026 basis. They are not the published
 * Permen PUPR AHSP coefficients or the DKI HSPK tables. To make the app quote
 * the official figures, upload that price list in **Pengetahuan** — the
 * assistant reads it, and the anchors here become the fallback rather than the
 * source.
 */

export const priceBasis = {
  region: 'DKI Jakarta',
  year: 2026,
  /** Sidebar footer. */
  line1: 'Basis harga',
  line2: 'AHSP 2026 · DKI Jakarta',
  /** Longer form for cards and export headers. */
  label: 'AHSP 2026 · DKI Jakarta',
  effectiveFrom: '1 Jan 2026',
  /**
   * How the anchors were restated from the December 2024 reference bill:
   * 18% material + labour escalation to a 2026 basis, 12% regional adjustment
   * from West Java to DKI Jakarta (wages, logistics, site access, disposal).
   */
  restatement: { escalation: 1.18, regional: 1.12, combined: 1.32 },
  /**
   * Figures in the app are quoted **on** the DKI Jakarta basis, so this index
   * is 1,00. A project outside DKI should carry its own index against it.
   */
  regionIndex: 1.0,
} as const

/**
 * Build cost per m² of gross floor area — landed residential, structure through
 * finishes, excluding land, VAT and design fees. Used to sanity-check a
 * generated bill: one that lands far below its class is almost always missing
 * scope rather than being efficient.
 */
export const perM2Guide = [
  { klass: 'Sederhana / subsidi', from: 4_500_000, to: 6_000_000 },
  { klass: 'Menengah', from: 7_500_000, to: 10_000_000 },
  { klass: 'Premium', from: 11_000_000, to: 16_000_000 },
] as const

/**
 * Anchor rates, rupiah per unit, material and labour installed, before
 * overhead and profit. These are the items that carry most of a residential
 * bill, so pinning them keeps a generated estimate in the right decade.
 */
export const anchorRates = [
  { item: 'Beton ready mix K-250 terpasang (incl. pompa & upah)', unit: 'm³', rate: 1_262_000 },
  { item: 'Beton ready mix K-300 terpasang', unit: 'm³', rate: 1_635_000 },
  { item: 'Pembesian besi ulir BjTS 420B, terpasang', unit: 'kg', rate: 25_500 },
  { item: 'Bekisting balok & kolom, multipleks', unit: 'm²', rate: 232_000 },
  { item: 'Bekisting sloof', unit: 'm²', rate: 172_900 },
  { item: 'Wiremesh W8 single layer', unit: 'm²', rate: 97_700 },
  { item: 'Galian tanah biasa', unit: 'm³', rate: 52_800 },
  { item: 'Urugan pasir padat t.100 mm', unit: 'm²', rate: 79_200 },
  { item: 'Lantai kerja beton t.50 mm', unit: 'm²', rate: 99_000 },
  { item: 'Dinding bata ringan AAC t.100 mm', unit: 'm²', rate: 309_500 },
  { item: 'Plesteran + acian dinding', unit: 'm²', rate: 120_100 },
  { item: 'Pengecatan dinding interior & eksterior', unit: 'm²', rate: 61_300 },
  { item: 'Homogeneous tile 60×60 terpasang', unit: 'm²', rate: 416_000 },
  { item: 'Plafon gypsum 9 mm rangka hollow', unit: 'm²', rate: 240_900 },
  { item: 'Kusen aluminium + daun pintu/jendela', unit: 'm¹', rate: 562_100 },
  { item: 'Rangka atap baja ringan + penutup', unit: 'm²', rate: 586_500 },
  { item: 'Waterproofing membrane', unit: 'm²', rate: 198_000 },
  { item: 'Instalasi titik lampu lengkap', unit: 'ttk', rate: 399_000 },
  { item: 'Pipa air bersih PPR PN10 Ø20 mm', unit: 'm¹', rate: 86_800 },
  { item: 'Unit AC split 1 PK + instalasi', unit: 'unit', rate: 7_630_000 },
] as const

/** The basis, as the `/api/build-up` model prompt receives it. */
export function basisForPrompt() {
  return {
    label: priceBasis.label,
    region: priceBasis.region,
    year: priceBasis.year,
    perM2Guide: perM2Guide.map((g) => ({ ...g })),
    anchorRates: anchorRates.map((a) => ({ ...a })),
  }
}
