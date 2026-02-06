import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useTournamentStore } from '../../store/tournamentStore'
import { readFileAsDataURL } from '../../utils/files'

export function TeamManager() {
  const teams = useTournamentStore((s) => s.teams)
  const addTeam = useTournamentStore((s) => s.addTeam)
  const updateTeam = useTournamentStore((s) => s.updateTeam)
  const deleteTeam = useTournamentStore((s) => s.deleteTeam)

  const [mode, setMode] = useState(null) // null | 'add' | 'edit'
  const [editingId, setEditingId] = useState(null)
  const editingTeam = useMemo(() => teams.find((t) => t.id === editingId) ?? null, [teams, editingId])

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs text-white/60">إدارة الفرق</div>
          <div className="mt-2 text-xl font-semibold text-white/90">الفرق المشاركة</div>
          <div className="mt-1 text-sm text-white/70">إضافة/تعديل/حذف + رفع شعار (Base64) مع حفظ تلقائي.</div>
        </div>
        <button
          className="rounded-xl bg-[#c9a227] px-4 py-2 text-sm font-semibold text-[#07162b] hover:bg-[#f6d365]"
          onClick={() => {
            setEditingId(null)
            setMode('add')
          }}
        >
          إضافة فريق
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {teams.length ? (
          teams.map((t) => (
            <TeamCard
              key={t.id}
              team={t}
              onEdit={() => {
                setEditingId(t.id)
                setMode('edit')
              }}
              onDelete={() => {
                const ok = confirm(`حذف الفريق: ${t.teamName || 'بدون اسم'} ؟`)
                if (ok) deleteTeam(t.id)
              }}
            />
          ))
        ) : (
          <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-white/60">
            لا توجد فرق بعد. أضف الفرق ثم انتقل لمرحلة توليد البطولة.
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-white/10 bg-black/20 p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            {team.logo ? (
              <img alt="شعار الفريق" src={team.logo} className="h-full w-full object-cover" />
            ) : (
              <div className="text-xs text-white/50">شعار</div>
            )}
          </div>
          <div>
            <div className="text-base font-semibold text-white/90">{team.teamName || 'بدون اسم'}</div>
            <div className="mt-1 text-xs text-white/60">{team.clubName || '—'}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
            onClick={onEdit}
          >
            تعديل
          </button>
          <button
            className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100 hover:bg-rose-500/15"
            onClick={onDelete}
          >
            حذف
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Field label="لاعب 1" value={team.player1} />
        <Field label="لاعب 2" value={team.player2} />
      </div>
    </motion.div>
  )
}

function Field({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-sm text-white/85">{value || '—'}</div>
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
      setForm((f) => ({ ...f, logo: dataUrl }))
    } catch (e) {
      setError(e?.message || 'فشل رفع الشعار')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function submit() {
    setError(null)
    if (!String(form.teamName).trim()) {
      setError('اسم الفريق مطلوب')
      return
    }
    onSubmit({
      teamName: form.teamName,
      clubName: form.clubName,
      player1: form.player1,
      player2: form.player2,
      logo: form.logo,
    })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60">
      <div className="flex min-h-full items-start justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-[#07162b]/80 p-6 text-white backdrop-blur max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-4rem)]"
        role="dialog"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-white/60">الفرق</div>
            <div className="mt-1 text-xl font-semibold">{title}</div>
          </div>
          <button
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            onClick={onClose}
          >
            إغلاق
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm text-white/80">اسم الفريق</label>
            <input
              value={form.teamName}
              onChange={(e) => setForm((f) => ({ ...f, teamName: e.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-[#c9a227]/60"
              placeholder="مثال: صقور رمضان"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm text-white/80">اسم النادي / المجموعة</label>
            <input
              value={form.clubName}
              onChange={(e) => setForm((f) => ({ ...f, clubName: e.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-[#c9a227]/60"
              placeholder="مثال: نادي الحي"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm text-white/80">اللاعب 1</label>
              <input
                value={form.player1}
                onChange={(e) => setForm((f) => ({ ...f, player1: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-[#c9a227]/60"
                placeholder="الاسم"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-white/80">اللاعب 2</label>
              <input
                value={form.player2}
                onChange={(e) => setForm((f) => ({ ...f, player2: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-[#c9a227]/60"
                placeholder="الاسم"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  {form.logo ? (
                    <img alt="الشعار" src={form.logo} className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-xs text-white/50">شعار</div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white/90">شعار الفريق</div>
                  <div className="mt-1 text-xs text-white/60">يتم حفظه كـ Base64 داخل المتصفح.</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickLogo(e.target.files?.[0])}
                />
                <button
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                  onClick={() => fileRef.current?.click()}
                >
                  رفع شعار
                </button>
                <button
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                  onClick={() => setForm((f) => ({ ...f, logo: null }))}
                >
                  إزالة
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            onClick={onClose}
          >
            إلغاء
          </button>
          <button
            className="rounded-xl bg-[#c9a227] px-4 py-2 text-sm font-semibold text-[#07162b] hover:bg-[#f6d365]"
            onClick={submit}
          >
            حفظ
          </button>
        </div>
      </motion.div>
    </div>
    </div>
  )
}
