import { useState } from 'react'
import { Field, Modal } from '@/components/Modal'
import type { ProjectInput } from '@/lib/projects'
import { btnGhost, btnPrimary } from '@/theme/styles'
import { color, sans } from '@/theme/tokens'
import type { Project } from '@/types'

/** Create / rename / duplicate dialog. `mode` only changes wording and defaults. */
export function ProjectDialog({
  mode,
  project,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'edit' | 'duplicate'
  project?: Project
  onClose: () => void
  onSubmit: (input: ProjectInput) => Promise<void>
}) {
  const [name, setName] = useState(
    mode === 'duplicate' ? `${project?.name ?? ''} (salinan)` : (project?.name ?? ''),
  )
  const [units, setUnits] = useState(project?.units ?? '')
  const [area, setArea] = useState(project?.area ?? '')
  const [location, setLocation] = useState(project?.location ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const title =
    mode === 'create' ? 'Proyek baru' : mode === 'edit' ? 'Ubah proyek' : 'Duplikat proyek'

  const submit = async () => {
    if (!name.trim()) {
      setError('Nama proyek wajib diisi.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit({ name: name.trim(), units, area, location })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan')
      setBusy(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mode === 'create' && (
          <div style={{ font: sans('400 11.5px/1.6'), color: color.muted }}>
            Proyek baru dimulai kosong. Isi datanya dengan mengunggah dokumen di menu
            Spesifikasi &amp; Material dan Pengetahuan — tidak ada angka contoh yang terbawa.
          </div>
        )}
        {mode === 'duplicate' && (
          <div style={{ font: sans('400 11.5px/1.6'), color: color.muted }}>
            Menyalin seluruh data proyek <strong>{project?.name}</strong> — material, dokumen
            pengetahuan, dan angka — sebagai titik awal proyek baru.
          </div>
        )}

        <Field label="Nama proyek" value={name} onChange={setName} />
        <Field label="Jumlah unit (mis. 48 unit)" value={units} onChange={setUnits} />
        <Field label="Luas (mis. 2.996 m²)" value={area} onChange={setArea} />
        <Field label="Lokasi (mis. Bekasi)" value={location} onChange={setLocation} />

        {error && (
          <div
            style={{
              background: color.redPanelBg,
              border: `1px solid ${color.redPanelBorder}`,
              color: color.redPanelText,
              borderRadius: 7,
              padding: '9px 11px',
              font: sans('400 11.5px/1.55'),
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
          <button type="button" style={btnGhost} onClick={onClose} disabled={busy}>
            Batal
          </button>
          <button
            type="button"
            style={{ ...btnPrimary, opacity: busy ? 0.6 : 1 }}
            onClick={() => void submit()}
            disabled={busy}
          >
            {busy ? 'Menyimpan…' : mode === 'edit' ? 'Simpan' : 'Buat proyek'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** Confirmation for a delete that also removes the project's data. */
export function DeleteProjectDialog({
  project,
  onClose,
  onConfirm,
}: {
  project: Project
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus')
      setBusy(false)
    }
  }

  return (
    <Modal title="Hapus proyek" onClose={onClose}>
      <div style={{ font: sans('400 12px/1.65'), marginBottom: 14 }}>
        Hapus <strong>{project.name}</strong> beserta seluruh datanya — daftar material, dokumen
        pengetahuan, berkas yang diunggah, dan angka biaya. Tindakan ini tidak bisa dibatalkan.
      </div>

      {error && (
        <div
          style={{
            background: color.redPanelBg,
            border: `1px solid ${color.redPanelBorder}`,
            color: color.redPanelText,
            borderRadius: 7,
            padding: '9px 11px',
            font: sans('400 11.5px/1.55'),
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" style={btnGhost} onClick={onClose} disabled={busy}>
          Batal
        </button>
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={busy}
          style={{
            border: 0,
            cursor: 'pointer',
            background: color.red,
            color: color.surface,
            borderRadius: 7,
            padding: '8px 14px',
            font: sans('500 12px'),
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Menghapus…' : 'Hapus permanen'}
        </button>
      </div>
    </Modal>
  )
}
