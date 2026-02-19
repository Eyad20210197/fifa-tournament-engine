import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useTournamentStore } from '../../store/tournamentStore'
import { readFileAsDataURL } from '../../utils/files'

export function TeamManager() {
  const teams = useTournamentStore((s) => s.teams)
  const addTeam = useTournamentStore((s) => s.addTeam)
  const updateTeam = useTournamentStore((s) => s.updateTeam)
  const deleteTeam = useTournamentStore((s) => s.deleteTeam)

  const [mode, setMode] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const editingTeam = useMemo(() => teams.find((team) => team.id === editingId) ?? null, [teams, editingId])

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--text-secondary)]">إدارة الفرق</p>
          <h3 className="mt-1 text-xl font-semibold">الفرق المشاركة</h3>
        </div>
        <button
          className="min-h-11 rounded-2xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b]"
          onClick={() => {
            setEditingId(null)
            setMode('add')
          }}
        >
          إضافة فريق
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {teams.length ? (
          teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onEdit={() => {
                setEditingId(team.id)
                setMode('edit')
              }}
              onDelete={() => {
                const ok = confirm(`حذف الفريق: ${team.teamName || 'بدون اسم'}؟`)
                if (ok) deleteTeam(team.id)
              }}
            />
          ))
        ) : (
          <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-[var(--text-secondary)]">
            لا توجد فرق بعد.
          </div>
        )}
      </div>

      {mode ? (
        <TeamModal
          title={mode === 'add' ? 'إضافة فريق' : 'تعديل فريق'}
          initial={mode === 'edit' ? editingTeam : null}
          onClose={() => {
            setMode(null)
            setEditingId(null)
          }}
          onSubmit={(data) => {
            if (mode === 'add') addTeam(data)
            if (mode === 'edit' && editingId) updateTeam(editingId, data)
            setMode(null)
            setEditingId(null)
          }}
        />
      ) : null}
    </div>
  )
}

function TeamCard({ team, onEdit, onDelete }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-12 w-12 flex-none place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            {team.logo ? <img alt="شعار الفريق" src={team.logo} className="h-full w-full object-cover" /> : <span>⚽</span>}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{team.teamName || 'بدون اسم'}</p>
            <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">{team.clubName || '--'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs" onClick={onEdit}>تعديل</button>
          <button className="min-h-11 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100" onClick={onDelete}>حذف</button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Field label="لاعب 1" value={team.player1} />
        <Field label="لاعب 2" value={team.player2} />
      </div>
    </motion.div>
  )
}

function Field({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1">{value || '--'}</p>
    </div>
  )
}

function TeamModal({ title, initial, onClose, onSubmit }) {
  const [form, setForm] = useState(() => ({
    teamName: initial?.teamName ?? '',
    clubName: initial?.clubName ?? '',
    player1: initial?.player1 ?? '',
    player2: initial?.player2 ?? '',
    logo: initial?.logo ?? null,
  }))
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  async function onPickLogo(file) {
    if (!file) return
    try {
      const dataUrl = await readFileAsDataURL(file)
      setForm((value) => ({ ...value, logo: dataUrl }))
    } catch (requestError) {
      setError(requestError?.message || 'فشل رفع الشعار')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function submit() {
    setError(null)
    if (!String(form.teamName).trim()) {
      setError('اسم الفريق مطلوب.')
      return
    }
    onSubmit(form)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[var(--surface-card)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-xl font-semibold">{title}</h4>
          <button className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm" onClick={onClose}>إغلاق</button>
        </div>

        {error ? <p className="mb-3 rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}

        <div className="grid gap-3">
          <Input label="اسم الفريق" value={form.teamName} onChange={(value) => setForm((state) => ({ ...state, teamName: value }))} />
          <Input label="اسم النادي" value={form.clubName} onChange={(value) => setForm((state) => ({ ...state, clubName: value }))} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="اللاعب الأول" value={form.player1} onChange={(value) => setForm((state) => ({ ...state, player1: value }))} />
            <Input label="اللاعب الثاني" value={form.player2} onChange={(value) => setForm((state) => ({ ...state, player2: value }))} />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                {form.logo ? <img alt="الشعار" src={form.logo} className="h-full w-full object-cover" /> : <span>⚽</span>}
              </div>
              <p className="text-sm text-[var(--text-secondary)]">شعار الفريق</p>
            </div>
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => onPickLogo(event.target.files?.[0])} />
              <button className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm" onClick={() => fileRef.current?.click()}>رفع</button>
              <button className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm" onClick={() => setForm((state) => ({ ...state, logo: null }))}>إزالة</button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm" onClick={onClose}>إلغاء</button>
          <button className="min-h-11 rounded-xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b]" onClick={submit}>حفظ</button>
        </div>
      </div>
    </div>
  )
}

function Input({ label, value, onChange }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <input
        className="min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
