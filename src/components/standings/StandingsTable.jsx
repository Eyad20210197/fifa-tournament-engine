import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { useTournamentStore } from '../../store/tournamentStore'
import { useLanguage } from '../../i18n/LanguageContext'
import { useSwipePages } from '../../hooks/useSwipePages'
import AppIcon from '../common/AppIcon'

const ROWS_PER_PAGE = 7

export function StandingsTable() {
  const standings = useTournamentStore((s) => s.standings)
  const teams = useTournamentStore((s) => s.teams)
  const { language } = useLanguage()

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams])
  const sorted = useMemo(() => {
    const list = (standings ?? []).slice()
    list.sort((a, b) => {
      if ((b.points ?? 0) !== (a.points ?? 0)) return (b.points ?? 0) - (a.points ?? 0)
      if ((b.gd ?? 0) !== (a.gd ?? 0)) return (b.gd ?? 0) - (a.gd ?? 0)
      return (b.gf ?? 0) - (a.gf ?? 0)
    })
    return list.map((row, index) => ({ ...row, rank: index + 1 }))
  }, [standings])

  const { page, pageIndex, pages, swipeHandlers } = useSwipePages(sorted, ROWS_PER_PAGE, 11000)

  return (
    <section className="flex h-full flex-col gap-3 overflow-hidden px-3 py-2" {...swipeHandlers}>
      <h2 className="shrink-0 text-center font-headline text-[clamp(1.6rem,3.4vw,4rem)] font-black text-white flex items-center justify-center gap-3">
        <AppIcon name="trophy" size={32} className="text-amber-400" />
        <span>{language === 'ar' ? 'جدول الترتيب العام' : 'LEAGUE STANDINGS TABLE'}</span>
      </h2>

      {/* Table Header */}
      <div className="grid grid-cols-[0.35fr_1.8fr_0.5fr_0.5fr_0.5fr_0.65fr] items-center gap-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">
        <span className="text-center">{language === 'ar' ? 'المركز' : 'POS'}</span>
        <span>{language === 'ar' ? 'الفريق' : 'CLUB / TEAM'}</span>
        <span className="text-center">{language === 'ar' ? 'لعب' : 'PL'}</span>
        <span className="text-center">{language === 'ar' ? 'فارق' : 'GD'}</span>
        <span className="text-center">{language === 'ar' ? 'له' : 'GF'}</span>
        <span className="text-center text-amber-400">{language === 'ar' ? 'نقاط' : 'PTS'}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={pageIndex}
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -80, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="grid min-h-0 flex-1 auto-rows-fr gap-2"
        >
          {page.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-slate-400 text-sm">
              {language === 'ar' ? 'لا توجد بيانات ترتيب حتى الآن' : 'No standings records available yet'}
            </div>
          ) : (
            page.map((row) => {
              const isTop = row.rank === 1
              return (
                <article
                  key={row.teamId || row.rank}
                  className={`grid grid-cols-[0.35fr_1.8fr_0.5fr_0.5fr_0.5fr_0.65fr] items-center gap-3 rounded-xl border px-4 py-2.5 transition-all ${
                    isTop
                      ? 'border-amber-400/50 bg-gradient-to-r from-amber-500/20 via-slate-900/80 to-slate-900/80 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                      : 'border-white/10 bg-slate-950/70'
                  }`}
                >
                  <p className={`text-center font-mono text-[clamp(1.1rem,2vw,2.2rem)] font-black ${isTop ? 'text-amber-400' : 'text-slate-400'}`}>
                    #{row.rank}
                  </p>
                  <p className="truncate font-headline text-[clamp(1.1rem,2.2vw,2.6rem)] font-bold text-white">
                    {teamById.get(row.teamId)?.teamName || '--'}
                  </p>
                  <Stat label={row.played ?? 0} />
                  <Stat label={row.gd ?? 0} />
                  <Stat label={row.gf ?? 0} />
                  <Stat label={row.points ?? 0} isPoints isTop={isTop} />
                </article>
              )
            })
          )}
        </motion.div>
      </AnimatePresence>

      {pages.length > 1 ? (
        <p className="shrink-0 text-center font-mono text-xs font-bold text-slate-400">
          {pageIndex + 1} / {pages.length}
        </p>
      ) : null}
    </section>
  )
}

function Stat({ label, isPoints = false, isTop = false }) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <p
        className={`font-mono text-[clamp(1.1rem,2vw,2.2rem)] font-black ${
          isPoints ? (isTop ? 'text-amber-400' : 'text-cyan-400') : 'text-slate-300'
        }`}
      >
        {label}
      </p>
    </div>
  )
}
