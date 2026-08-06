import type { SpecData } from '@/types'

export const spesifikasi: SpecData = {
  documents: ['RKS-ARS-rev2.pdf', 'RKS-MEP-rev1.pdf', 'daftar-material.xlsx'],
  projectClasses: ['Subsidi', 'Menengah', 'Premium'],
  activeClass: 'Menengah',
  itemCount: 128,
  divisionCount: 5,
  shownCount: 9,
  materials: [
    {
      id: 'm1',
      division: 'Struktur',
      item: 'Beton ready mix',
      spec: 'K-300, slump 12±2 cm',
      standard: 'SNI 2847:2019',
      volume: '412,60 m³',
      status: 'clear',
      statusLabel: 'Jelas ✓',
    },
    {
      id: 'm2',
      division: 'Struktur',
      item: 'Besi beton ulir',
      spec: 'BjTS 420B, D13 & D10',
      standard: 'SNI 2052:2017',
      volume: '62.480 kg',
      status: 'clear',
      statusLabel: 'Jelas ✓',
    },
    {
      id: 'm3',
      division: 'Arsitektur',
      item: 'Dinding bata ringan',
      spec: 'AAC 7,5 cm, 600 kg/m³',
      standard: 'SNI 8640:2018',
      volume: '6.240,00 m²',
      status: 'clear',
      statusLabel: 'Jelas ✓',
    },
    {
      id: 'm4',
      division: 'Arsitektur',
      item: 'Cat dinding interior',
      spec: '“cat kualitas baik, warna sesuai persetujuan”',
      standard: '—',
      volume: '11.860,00 m²',
      status: 'ambiguous',
      statusLabel: 'Ambigu ⚠',
    },
    {
      id: 'm5',
      division: 'Arsitektur',
      item: 'Granit lantai',
      spec: '60×60 polished, motif custom',
      standard: 'SNI ISO 13006',
      volume: '2.884,00 m²',
      status: 'overspec',
      statusLabel: 'Over-spec ⚠',
    },
    {
      id: 'm6',
      division: 'MEP',
      item: 'Kabel NYY 4×16 mm²',
      spec: 'tembaga, 0,6/1 kV, SNI mark',
      standard: 'SNI 04-6629',
      volume: '1.240,00 m¹',
      status: 'clear',
      statusLabel: 'Jelas ✓',
    },
    {
      id: 'm7',
      division: 'MEP',
      item: 'Pipa air panas PPR',
      spec: 'PN20 Ø20 mm, merek disebut tipe lama',
      standard: 'SNI 7511:2011',
      volume: '960,00 m¹',
      status: 'unavailable',
      statusLabel: 'Tidak tersedia ✕',
    },
    {
      id: 'm8',
      division: 'Interior',
      item: 'Kitchen set built-in',
      spec: 'HPL 0,8 mm, rangka multipleks 18 mm',
      standard: '—',
      volume: '48,00 unit',
      status: 'clear',
      statusLabel: 'Jelas ✓',
    },
    {
      id: 'm9',
      division: 'Lansekap',
      item: 'Paving block carport',
      spec: 'K-300 tebal 8 cm, tipe bata',
      standard: 'SNI 03-0691',
      volume: '1.152,00 m²',
      status: 'clear',
      statusLabel: 'Jelas ✓',
    },
  ],
  openFindings: 12,
  findings: [
    {
      title: 'Spek ambigu — “cat kualitas baik”',
      body: 'Tanpa merek, tipe, atau daya sebar. Selisih harga antar pilihan bisa 40%.',
    },
    {
      title: 'Over-spec untuk kelas menengah',
      body: 'Granit motif custom 60×60 di seluruh unit. Standar internal kelas menengah: homogeneous tile stok reguler.',
    },
    {
      title: 'Lead time panjang',
      body: 'Granit custom 12 minggu, kusen aluminium powder coating warna khusus 8 minggu.',
    },
    {
      title: 'Bentrok antar dokumen',
      body: 'RKS menulis bata ringan 10 cm, daftar material menulis 7,5 cm.',
    },
  ],
  alternativesFor: 'Granit lantai 60×60 custom',
  alternatives: [
    {
      name: 'Homogeneous tile 60×60 stok reguler',
      delta: '−22%',
      availability: 'tersedia · lead time 2 minggu',
      note: 'Mutu setara untuk hunian; motif lebih terbatas.',
    },
    {
      name: 'Granit lokal 60×60 motif standar',
      delta: '−13%',
      availability: 'tersedia · lead time 4 minggu',
      note: 'Mutu setara, penyerapan air sedikit lebih tinggi.',
    },
  ],
}

/** Steps shown while a spec document is being parsed (the "Memproses" state). */
export const parseSteps = [
  { state: 'done' as const, label: 'Memisah halaman & OCR', meta: '64/64' },
  { state: 'done' as const, label: 'Mengenali pasal spesifikasi', meta: 'selesai' },
  { state: 'active' as const, label: 'Menyusun tabel material', meta: '128 item', progress: 58 },
  {
    state: 'idle' as const,
    label: 'Mencocokkan standar & ketersediaan pasar',
    meta: 'menunggu',
  },
]

export const parseHeader = {
  title: 'Membaca RKS Arsitektur.pdf',
  meta: '64 halaman · perkiraan sisa 40 detik',
}

export const partialError = {
  title: 'Sebagian dokumen gagal dibaca',
  body: 'Halaman 41–58 RKS MEP.pdf berupa hasil scan miring dan tidak terbaca. Hasil di bawah adalah hasil parsial — 96 dari perkiraan 128 item. Item MEP kemungkinan belum lengkap.',
}

export const emptyState = {
  title: 'Belum ada dokumen spesifikasi',
  body: 'Upload RKS atau daftar material untuk mulai. Format yang diterima: PDF, DOCX, XLSX, CSV, JPG/PNG.',
  cta: 'Upload dokumen',
}
