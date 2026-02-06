import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTournamentStore } from '../../store/tournamentStore'

export function TournamentGenerator() {
  const format = useTournamentStore((s) => s.tournament.format)
  const setTournament = useTournamentStore((s) => s.setTournament)
  const teamsCount = useTournamentStore((s) => s.teams.length)
  const matchesCount = useTournamentStore((s) => s.matches.length)
  const generateTournament = useTournamentStore((s) => s.generateTournament)
  const recalcStandings = useTournamentStore((s) => s.recalcStandings)

  const [error, setError] = useState(null)

  const options = useMemo(
    () => [
      { value: 'دوري', label: 'دوري (ذهاب واحد)' },
      { value: 'خروج مغلوب', label: 'خروج مغلوب (شجرة)' },
    ],
    [],
  )

  function onGenerate() {
    setError(null)
    if (teamsCount < 2) {
      setError('أضف فريقين على الأقل قبل توليد البطولة')
      return
    }
    if (matchesCount > 0) {
      const ok = confirm('سيتم استبدال الجدول/الشجرة الحالية. هل تريد المتابعة؟')
      if (!ok) return
    }
    generateTournament({ format })
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs text-white/60">مولّد البطولة</div>
          <div className="mt-2 text-xl font-semibold text-white/90">توليد الجدول / الشجرة</div>
          <div className="mt-1 text-sm text-white/70">ينشئ المباريات تلقائياً حسب نوع البطولة.</div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm text-white/80">نوع البطولة</div>
          <div className="mt-3 grid gap-2">
            {options.map((o) => {
              const active = format === o.value
              return (
                <button
                  key={o.value}
                  className={[
                    'rounded-2xl border px-4 py-3 text-sm text-right transition',
                    active
                      ? 'border-[#c9a227]/60 bg-[#c9a227]/10 text-[#f6d365]'
                      : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10',
                  ].join(' ')}
                  onClick={() => setTournament({ format: o.value })}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm text-white/80">العمليات</div>
          <div className="mt-3 grid gap-2">
            <motion.button
              whileTap={{ scale: 0.99 }}
              className="rounded-2xl bg-[#c9a227] px-4 py-3 text-sm font-semibold text-[#07162b] hover:bg-[#f6d365] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onGenerate}
              disabled={teamsCount < 2}
            >
              توليد البطولة
            </motion.button>
            <button
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10"
              onClick={() => recalcStandings()}
              disabled={format !== 'دوري'}
              title={format !== 'دوري' ? 'متاح فقط في الدوري' : undefined}
            >
              إعادة حساب الترتيب
            </button>
          </div>

          <div className="mt-3 text-xs text-white/60">
            الفرق: {teamsCount} • المباريات: {matchesCount}
          </div>
        </div>
      </div>
    </div>
  )
}

