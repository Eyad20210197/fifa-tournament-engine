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
      { value: 'دوري', label: 'دوري (مجموعات)' },
      { value: 'خروج مغلوب', label: 'خروج مغلوب (إقصائي)' },
    ],
    [],
  )

  function onGenerate() {
    setError(null)
    if (teamsCount < 2) {
      setError('أضف فريقين على الأقل قبل التوليد.')
      return
    }
    if (matchesCount > 0) {
      const ok = confirm('سيتم استبدال الجدول الحالي. هل تريد المتابعة؟')
      if (!ok) return
    }
    generateTournament({ format })
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
      <h3 className="text-xl font-semibold">توليد الجدول</h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">اختيار النمط ثم توليد المباريات تلقائيا</p>

      {error ? <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="grid gap-2">
            {options.map((option) => {
              const active = format === option.value
              return (
                <button
                  key={option.value}
                  className={[
                    'min-h-11 rounded-2xl border px-4 py-2 text-right text-sm',
                    active
                      ? 'border-[var(--primary-color)]/60 bg-[var(--primary-color)]/10 text-[var(--secondary-color)]'
                      : 'border-white/10 bg-white/5 text-[var(--text-primary)]',
                  ].join(' ')}
                  onClick={() => setTournament({ format: option.value })}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="grid gap-2">
            <motion.button
              whileTap={{ scale: 0.99 }}
              className="min-h-11 rounded-2xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b]"
              onClick={onGenerate}
              disabled={teamsCount < 2}
            >
              توليد البطولة
            </motion.button>
            <button
              className="min-h-11 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm"
              onClick={() => recalcStandings()}
              disabled={format !== 'دوري'}
            >
              إعادة حساب الترتيب
            </button>
          </div>
          <p className="mt-3 text-xs text-[var(--text-secondary)]">الفرق: {teamsCount} • المباريات: {matchesCount}</p>
        </div>
      </div>
    </div>
  )
}
