import { color } from '@/theme/tokens'
import type { ClashDetail, VeDetail, VolumeTrace } from '@/types'

export const volumeTrace: VolumeTrace = {
  kicker: 'PENELUSURAN VOLUME · ITEM 3.2',
  title: 'Plesteran 1:4 + acian dinding',
  formulaLines: [
    { text: 'Plesteran dinding' },
    { text: '= keliling 48,00 m × tinggi 3,20 m' },
    { text: '  − bukaan 12,40 m²' },
    { text: '= 141,20 m² per unit', accent: true },
    { text: '× 84 bidang = 11.860,00 m²', accent: true },
  ],
  facts: [
    { label: 'Harga satuan', value: '78.500 /m²' },
    { label: 'Sumber harga', value: 'AHSP 2026 · A.4.4.2.2' },
    { label: 'Indeks wilayah', value: 'Bekasi · 1,04' },
    { label: 'Berlaku sejak', value: '1 Jul 2026' },
  ],
  total: { label: 'Jumlah harga', value: '931.010.000' },
  drawingCaption: 'ARS-rev04.pdf · lembar 07 · denah unit tipe 45',
}

export const veDetail: VeDetail = {
  kicker: 'USULAN VALUE ENGINEERING',
  title: 'Lantai granit unit → homogeneous tile',
  saving: 'Rp 412.000.000',
  savingNote: '2,2% dari total\n−10 hari',
  before: 'Granit 60×60 polished motif custom, seluruh unit — 2.884 m² @ 428.000',
  after: 'Homogeneous tile 60×60 stok reguler, kelas mutu setara — 2.884 m² @ 285.000',
  facts: [
    { label: 'Dampak mutu', value: 'Setara' },
    { label: 'Dampak waktu', value: 'Lebih cepat 10 hari', valueColor: color.greenOk },
    { label: 'Lead time', value: '12 minggu → 2 minggu' },
    { label: 'Status', value: 'Disetujui', chip: 'green' },
  ],
  risk: 'Risiko & catatan: motif lebih terbatas — perlu persetujuan tim marketing untuk unit contoh. Tidak berdampak pada struktur.',
}

export const clashDetail: ClashDetail = {
  kicker: 'TEMUAN 01',
  title: 'Balok B2 menabrak kusen jendela J-3',
  level: 'Kritis',
  location: 'Lt.2, grid C-4 · Struktur ↔ Arsitektur',
  problem:
    'Balok B2 tinggi 60 cm turun sampai elevasi +2,05, sementara ambang atas kusen J-3 berada di +2,10. Tumpang tindih 5 cm sepanjang bentang 3,6 m.',
  recommendation:
    'Turunkan ambang kusen J-3 ke +2,00 (opsi termurah, tanpa hitung ulang struktur), atau ubah dimensi balok jadi 30/50 dengan pembesian tambahan — perlu approval konsultan struktur.',
  facts: [
    { label: 'PIC', value: 'Dian P. — Arsitektur' },
    { label: 'Ditemukan', value: '4 Agu 2026 · otomatis' },
    { label: 'Status', value: 'Terbuka', valueColor: color.redText },
  ],
  drawingCaption: 'overlay STR-rev02 × ARS-rev04 · potongan A-A',
}
