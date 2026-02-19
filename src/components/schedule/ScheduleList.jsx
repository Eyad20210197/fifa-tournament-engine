import { useMemo } from 'react'
import { useTournamentStore } from '../../store/tournamentStore'
import { formatArabicNumber } from '../../utils/format'

export function ScheduleList() {
  const matches = useTournamentStore((s) => s.matches)
  const teams = useTournamentStore((s) => s.teams)
  const liveMatchId = useTournamentStore((s) => s.liveMatchState.matchId)

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams])
  const sorted = useMemo(() => {
    const list = (matches ?? []).slice()
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.id).localeCompare(String(b.id)))
    return list
  }, [matches])

  return (
    <div className="h-full rounded-3xl border border-white/10 bg-black/20 p-[2vw]">
      <h2 className="mb-4 text-[clamp(1.2rem,2.3vw,3rem)] font-semibold">جدول المباريات</h2>

      <div className="h-[72vh] overflow-auto rounded-2xl border border-white/10 bg-black/25">
        <table className="min-w-full text-right text-[clamp(0.82rem,1.05vw,1.3rem)]">
          <thead className="sticky top-0 bg-[#10213a] text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-3">المباراة</th>
              <th className="px-4 py-3">الحالة</th>
              <th className="px-4 py-3">النتيجة</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length ? (
              sorted.map((match) => (
                <tr
                  key={match.id}
                  className={['border-t border-white/10', match.id === liveMatchId ? 'bg-[var(--primary-color)]/10' : ''].join(' ')}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <TeamName team={teamById.get(match.homeTeamId)} />
                      <span className="text-[var(--text-secondary)]">ضد</span>
                      <TeamName team={teamById.get(match.awayTeamId)} reverse />
                    </div>
                  </td>
                  <td className="px-4 py-3">{statusArabic(match.status)}</td>
                  <td className="px-4 py-3 font-semibold text-[var(--secondary-color)]">
                    {formatArabicNumber(match.homeScore ?? 0)} - {formatArabicNumber(match.awayScore ?? 0)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-10 text-center text-[var(--text-secondary)]" colSpan={3}>
                  لا توجد مباريات حاليا.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TeamName({ team, reverse = false }) {
  return (
    <div className={['flex min-w-0 items-center gap-2', reverse ? 'flex-row-reverse' : ''].join(' ')}>
      <span className="grid h-8 w-8 flex-none place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
        {team?.logo ? <img alt="" src={team.logo} className="h-full w-full object-cover" /> : <span>⚽</span>}
      </span>
      <span className="truncate">{team?.teamName || '--'}</span>
    </div>
  )
}

function statusArabic(status) {
  if (status === 'pending') return 'لم تبدأ'
  if (status === 'live') return 'مباشر'
  if (status === 'finished') return 'انتهت'
  return '--'
}
