import { color } from '@/theme/tokens'
import type { BmwData } from '@/types'

export const bmw: BmwData = {
  scenarios: [
    {
      key: 'basic',
      name: 'Basic',
      subtitle: 'dari VE semua disetujui',
      cost: {
        total: 'Rp 24,03 M',
        perM2: '8.021.000 /m²',
        delta: '−8,5% vs dasar',
        deltaColor: color.greenOk,
      },
      quality: [
        'Finishing ekonomis',
        'Umur pakai ±15 tahun',
        'Perawatan 42 jt/tahun',
        'SNI minimum terpenuhi',
      ],
      qualityFlagColor: color.amberText,
      time: { weeks: '31 minggu', lines: ['Kritis: struktur → finishing', 'Lead time terpanjang 6 mgg'] },
      risk: 'Komplain mutu finishing di serah terima; biaya perawatan naik setelah tahun ke-5.',
      axes: { b: 92, m: 54, t: 88 },
      recommendation: {
        why: 'Unggul saat bobot biaya dan waktu dominan: hemat Rp 1,57 M dan selesai 3 minggu lebih cepat dari skenario dasar. Semua item VE sudah diperhitungkan, tidak ada yang menabrak SNI.',
        watch:
          'umur pakai finishing ±15 tahun dan biaya perawatan 42 jt/tahun — jelaskan ke marketing sebelum harga jual dikunci.',
      },
    },
    {
      key: 'std',
      name: 'Standard',
      subtitle: 'spesifikasi RKS saat ini',
      isBase: true,
      cost: { total: 'Rp 26,27 M', perM2: '8.768.000 /m²', delta: '—' },
      quality: [
        'Finishing kelas menengah',
        'Umur pakai ±25 tahun',
        'Perawatan 31 jt/tahun',
        'Patuh penuh SNI',
      ],
      qualityFlagColor: color.greenOk,
      time: { weeks: '34 minggu', lines: ['Kritis: struktur → granit', 'Lead time terpanjang 12 mgg'] },
      risk: 'Granit custom bergantung satu pabrikan; sensitif terhadap harga besi.',
      axes: { b: 74, m: 78, t: 76 },
      recommendation: {
        why: 'Titik tengah paling stabil: mutu patuh penuh SNI dengan biaya masih di dalam rentang pasar kelas menengah. Empat usulan VE yang sudah disetujui tetap bisa dipakai tanpa mengubah kelas.',
        watch:
          'granit custom bergantung satu pabrikan dengan lead time 12 minggu — kunci PO lebih awal atau ambil alternatif setara.',
      },
    },
    {
      key: 'prem',
      name: 'Premium',
      subtitle: 'upgrade finishing & MEP',
      cost: {
        total: 'Rp 30,09 M',
        perM2: '10.043.000 /m²',
        delta: '+14,6% vs dasar',
        deltaColor: color.red,
      },
      quality: [
        'Finishing kelas atas',
        'Umur pakai ±35 tahun',
        'Perawatan 24 jt/tahun',
        'SNI + spek tambahan',
      ],
      qualityFlagColor: color.greenOk,
      time: { weeks: '41 minggu', lines: ['Kritis: MEP → interior', 'Lead time terpanjang 16 mgg'] },
      risk: 'Tiga material impor vendor tunggal; pelaksanaan butuh tukang spesialis.',
      axes: { b: 48, m: 94, t: 55 },
      recommendation: {
        why: 'Menang saat mutu jadi penentu: umur pakai ±35 tahun dan biaya perawatan paling rendah, 24 jt/tahun. Cocok kalau posisi produk digeser ke segmen atas.',
        watch:
          'durasi 41 minggu dan tiga material impor vendor tunggal — biaya carrying dan risiko keterlambatan naik.',
      },
    },
  ],
  sensitivity: {
    title: 'Analisa sensitivitas',
    subtitle: 'kenaikan harga 10% pada skenario dasar',
    rows: [
      { label: 'Besi beton', impact: 'total +2,1%' },
      { label: 'Beton ready mix', impact: 'total +1,6%' },
      { label: 'Granit & keramik', impact: 'total +0,9%' },
    ],
  },
}

/** Default weighting of the Biaya / Mutu / Waktu sliders — always sums to 100. */
export const defaultWeights = { b: 40, m: 35, t: 25 }
