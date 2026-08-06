import { color } from '@/theme/tokens'
import type { CompositeData } from '@/types'

export const komposit: CompositeData = {
  disciplines: [
    {
      name: 'Arsitektur',
      accent: color.layerArs,
      status: 'Siap ✓',
      statusTone: 'green',
      lines: ['ARS-rev04.pdf · 18 lembar', 'Lt.1, Lt.2, atap'],
    },
    {
      name: 'Sipil / Struktur',
      accent: color.layerStr,
      status: 'Siap ✓',
      statusTone: 'green',
      lines: ['STR-rev02.pdf · 12 lembar', 'pondasi, Lt.1, Lt.2'],
    },
    {
      name: 'MEP',
      accent: color.layerMep,
      status: 'Diproses…',
      statusTone: 'amber',
      lines: ['MEP-rev03.dwg · konversi 7/9', 'elektrikal, plumbing, AC'],
    },
    {
      name: 'Interior',
      status: 'Belum diupload',
      statusTone: 'neutral',
      lines: ['Tarik file ke sini', 'PDF · DWG · JPG/PNG'],
      placeholder: true,
    },
  ],
  clashTotal: 24,
  clashes: [
    {
      no: '01',
      location: 'Lt.2, grid C-4',
      disciplines: 'Struktur ↔ Arsitektur',
      problem: 'Balok B2 (h 60 cm) menabrak kusen jendela J-3',
      level: 'Kritis',
      pic: 'Dian P.',
      status: 'Terbuka',
      statusColor: color.redText,
    },
    {
      no: '02',
      location: 'Lt.1, grid B-2',
      disciplines: 'MEP ↔ Struktur',
      problem: 'Ducting AC Ø30 cm menembus balok induk tanpa sleeve',
      level: 'Kritis',
      pic: 'Andri W.',
      status: 'Terbuka',
      statusColor: color.redText,
    },
    {
      no: '03',
      location: 'Lt.2, grid B-3',
      disciplines: 'MEP ↔ Interior',
      problem: 'Titik lampu tidak sejajar pola plafon drop ceiling',
      level: 'Mayor',
      pic: 'Sinta R.',
      status: 'Ditinjau',
      statusColor: color.amberText,
    },
    {
      no: '04',
      location: 'Lt.1, grid D-2',
      disciplines: 'Arsitektur ↔ Interior',
      problem: 'Stop kontak tertutup posisi lemari built-in',
      level: 'Minor',
      pic: 'Sinta R.',
      status: 'Selesai',
      statusColor: color.greenText,
    },
    {
      no: '05',
      location: 'Lt.1–Lt.2, shaft S-1',
      disciplines: 'MEP ↔ Struktur',
      problem: 'Posisi shaft plumbing bergeser 40 cm antar lantai',
      level: 'Mayor',
      pic: 'Andri W.',
      status: 'Terbuka',
      statusColor: color.redText,
    },
  ],
  checklist: [
    { state: 'fail', label: 'Tinggi plafon vs jalur ducting & pipa' },
    { state: 'fail', label: 'Posisi shaft konsisten antar lantai' },
    { state: 'fail', label: 'Balok vs bukaan pintu/jendela' },
    { state: 'warn', label: 'Titik lampu & sprinkler vs pola plafon' },
    { state: 'ok', label: 'Posisi stop kontak vs layout furnitur' },
    { state: 'ok', label: 'Kolom vs layout unit' },
    { state: 'ok', label: 'Jalur drainase vs struktur pondasi' },
  ],
  lockBlockedNote: 'Gambar belum bisa dikunci: 2 temuan kritis masih terbuka.',
  coordination: {
    doneNote: '18 dari 24 temuan selesai — 75%',
    donePct: 75,
    counts: [
      { label: 'Kritis', value: '2 terbuka', color: color.redText },
      { label: 'Mayor', value: '3 terbuka', color: color.amberText },
      { label: 'Minor', value: '1 terbuka', color: color.muted },
    ],
  },
}

export const lockTooltip = 'Masih ada 2 temuan kritis terbuka'
export const floors = ['Lt.1', 'Lt.2', 'Atap'] as const
