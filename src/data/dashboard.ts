import { color } from '@/theme/tokens'
import type { DashboardData } from '@/types'

export const dashboard: DashboardData = {
  greeting: 'Halo, Rizky 👋',
  subtitle: 'Cluster Anggrek — Tahap 2 · 48 unit tipe 45/90 · Bekasi · Rabu, 6 Agustus 2026',
  versionNote: 'Studi kelayakan v3\ndiperbarui 2 jam lalu',
  kpis: [
    {
      label: 'Estimasi Biaya Total',
      value: 'Rp 26,27',
      unit: ' M',
      note: '▲ 3,1% vs v2',
      noteColor: color.red,
    },
    {
      label: 'Cost per m²',
      value: '8.768.000',
      note: 'rentang pasar 7,5–10,0 jt',
      noteColor: color.muted,
    },
    {
      label: 'Durasi Estimasi',
      value: '34',
      unit: ' minggu',
      note: '▼ 2 minggu vs v2',
      noteColor: color.greenOk,
    },
    {
      label: 'Potensi Saving VE',
      value: 'Rp 1,79',
      unit: ' M',
      valueColor: color.greenOk,
      note: '6,8% · 4 dari 9 disetujui',
      noteColor: color.muted,
    },
  ],
  modules: [
    {
      screen: 'spek',
      glyph: '◈',
      badge: '12 temuan terbuka',
      badgeTone: 'amber',
      title: 'Spesifikasi & Material',
      body: 'Bedah RKS jadi daftar material terstruktur, tandai spek ambigu dan over-spec.',
    },
    {
      screen: 'cost',
      glyph: '◱',
      badge: '9 usulan VE',
      badgeTone: 'green',
      title: 'Build Up Cost & VE',
      body: 'Breakdown biaya per komponen, benchmark per m², dan kandidat penghematan.',
    },
    {
      screen: 'bmw',
      glyph: '◬',
      badge: '3 skenario',
      badgeTone: 'neutral',
      title: 'Biaya–Mutu–Waktu',
      body: 'Bandingkan skenario dan lihat apa yang dikorbankan saat biaya ditekan.',
    },
    {
      screen: 'gbr',
      glyph: '◫',
      badge: '2 clash kritis',
      badgeTone: 'red',
      title: 'Gambar Komposit',
      body: 'Cek silang arsitektur, sipil, MEP, dan interior sebelum gambar dikunci.',
    },
    {
      screen: 'bq',
      glyph: '≡',
      badge: 'BQ v2 · 214 item',
      badgeTone: 'green',
      title: 'BQ / RAB',
      body: 'Terbitkan Bill of Quantity dan RAB langsung dari gambar komposit yang sudah dikunci — tiap volume bisa ditelusuri sampai ke dasar perhitungannya.',
      wide: true,
    },
  ],
  alerts: [
    {
      severity: 'critical',
      title: 'Balok B2 menabrak kusen jendela J-3',
      meta: 'Lt.2, grid C-4 · Struktur ↔ Arsitektur',
    },
    {
      severity: 'critical',
      title: 'Ducting AC menembus balok induk',
      meta: 'Lt.1, grid B-2 · MEP ↔ Struktur',
    },
    { severity: 'major', title: '7 item BQ berkeyakinan rendah', meta: 'mayoritas di divisi MEP' },
    {
      severity: 'major',
      title: 'Granit 60×60 motif custom lead time 12 minggu',
      meta: 'berisiko menahan finishing',
    },
  ],
  activity: [
    { title: 'BQ v2 diterbitkan', meta: 'Rizky A. · 2 jam lalu' },
    { title: 'Gambar MEP rev.03 diupload', meta: 'Dian P. · kemarin' },
    { title: '4 usulan VE disetujui', meta: 'Budi S. · 3 Agu 2026' },
    { title: 'RKS Arsitektur.pdf diupload', meta: 'Rizky A. · 1 Agu 2026' },
  ],
}
