import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { useTournamentStore } from '../../store/tournamentStore'
import { useLanguage } from '../../i18n/LanguageContext'
import { useSwipePages } from '../../hooks/useSwipePages'
import AppIcon from '../common/AppIcon'

const MATCHES_PER_PAGE = 4

export function BracketView() {
  const matches = useTournamentStore((s) => s.matches)
  const teams = useTournamentStore((s) => s.teams)
  const { language } = useLanguage()

  const stagePages = useMemo(() => {
    const nameById = new Map(teams.map((team) => [team.id, team.teamName]))
    const knockout = matches.filter((item) => item.mode === 'knockout').slice()
    knockout.sort((a, b) => new Date(a.starts_at || a.startsAt || 0) - new Date(b.starts_at || b.startsAt || 0))

    const grouped = new Map()
    for (const match of knockout) {
      const stageName = String(match.stageName || match.stage_name || (language === 'ar' ? `الجولة ${match.round ?? 1}` : `Round ${match.round ?? 1}`))
      if (!grouped.has(stageName)) grouped.set(stageName, [])
      grouped.get(stageName).push({
        ...match,
        homeName: nameById.get(match.homeTeamId) || '--',
        awayName: nameById.get(match.awayTeamId) || '--',
      })
    }

    const pages = []
    for (const [stageName, stageMatches] of grouped.entries()) {
      const totalParts = Math.ceil(stageMatches.length / MATCHES_PER_PAGE) || 1
      for (let i = 0; i < stageMatches.length; i += MATCHES_PER_PAGE) {
        pages.push({
          stageName,
          partIndex: Math.floor(i / MATCHES_PER_PAGE) + 1,
          totalParts,
          matches: stageMatches.slice(i, i + MATCHES_PER_PAGE),
        })
      }
    }
    return pages
  }, [matches, teams, language])

  const { page, pageIndex, pages, swipeHandlers } = useSwipePages(stagePages, 1, 12000)
  const active = page[0] || null

  if (!active) {
    return (
      <section className="grid h-full place-items-center overflow-hidden p-6 text-center">
        <div className="space-y-2">
          <AppIcon name="layers" size={48} className="mx-auto text-slate-600" />
          <p className="font-headline text-[clamp(1.2rem,2vw,2.2rem)] text-slate-400 font-bold">
            {language === 'ar' ? 'لا توجد شجرة إقصائية بعد' : 'No Knockout Bracket Available Yet'}
          </p>
          <p className="text-xs text-slate-500">
            {language === 'ar' ? 'ستظهر شجرة البطولة عند اختيار نمط خروج المغلوب' : 'Knockout tree appears when tournament format is Single Elimination'}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="flex h-full flex-col gap-3 overflow-hidden px-3 py-2" {...swipeHandlers}>
      <h2 className="shrink-0 text-center font-headline text-[clamp(1.6rem,3.4vw,4rem)] font-black text-white flex items-center justify-center gap-3">
        <AppIcon name="trophy" size={32} className="text-amber-400" />
        <span>{language === 'ar' ? 'شجرة الأدوار الإقصائية' : 'KNOCKOUT PLAYOFF BRACKET'}</span>
      </h2>
      <p className="shrink-0 text-center font-bold text-xs uppercase tracking-widest text-sky-400">
        {active.stageName}
        {active.totalParts > 1 ? ` • ${active.partIndex}/${active.totalParts}` : ''}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={pageIndex}
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="grid min-h-0 flex-1 auto-rows-fr gap-3 max-w-5xl mx-auto w-full"
        >
          {active.matches.map((match) => {
            const isFinished = match.winner_team_id != null || match.winnerTeamId != null
            const winnerId = match.winner_team_id || match.winnerTeamId
            const homeWon = isFinished && winnerId === match.homeTeamId
            const awayWon = isFinished && winnerId === match.awayTeamId

            return (
              <article
                key={match.id}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
              >
                {/* Home Team */}
                <div className="flex items-center justify-end gap-2 min-w-0">
                  <span
                    className={`truncate text-right font-headline text-[clamp(1.2rem,2.4vw,2.6rem)] font-bold ${
                      homeWon ? 'text-amber-400' : awayWon ? 'text-slate-500 line-through opacity-60' : 'text-white'
                    }`}
                  >
                    {match.homeName}
                  </span>
                  {homeWon && <AppIcon name="check" size={20} className="text-amber-400 shrink-0" />}
                </div>

                {/* Score / VS Pill */}
                <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/60 px-4 py-2 font-mono">
                  <span className={`text-xl font-black ${homeWon ? 'text-amber-400' : 'text-cyan-300'}`}>
                    {match.homeScore ?? 0}
                  </span>
                  <span className="text-slate-500 font-bold">:</span>
                  <span className={`text-xl font-black ${awayWon ? 'text-amber-400' : 'text-amber-300'}`}>
                    {match.awayScore ?? 0}
                  </span>
                </div>

                {/* Away Team */}
                <div className="flex items-center justify-start gap-2 min-w-0">
                  {awayWon && <AppIcon name="check" size={20} className="text-amber-400 shrink-0" />}
                  <span
                    className={`truncate text-left font-headline text-[clamp(1.2rem,2.4vw,2.6rem)] font-bold ${
                      awayWon ? 'text-amber-400' : homeWon ? 'text-slate-500 line-through opacity-60' : 'text-white'
                    }`}
                  >
                    {match.awayName}
                  </span>
                </div>
              </article>
            )
          })}
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
