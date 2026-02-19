import { useMemo } from 'react'
import { useTournamentStore } from '../../store/tournamentStore'
import { formatArabicNumber } from '../../utils/format'

export function StandingsTable() {
  const standings = useTournamentStore((s) => s.standings)
  const teams = useTournamentStore((s) => s.teams)

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams])
  const sorted = useMemo(() => {
    const list = (standings ?? []).slice()
    list.sort((a, b) => {
      if ((b.points ?? 0) !== (a.points ?? 0)) return (b.points ?? 0) - (a.points ?? 0)
      if ((b.gd ?? 0) !== (a.gd ?? 0)) return (b.gd ?? 0) - (a.gd ?? 0)
      return (b.gf ?? 0) - (a.gf ?? 0)
    })
    return list
  }, [standings])

  return (
    <div className="h-full rounded-3xl border border-white/10 bg-black/20 p-[2.2vw]">
      <h2 className="mb-4 text-[clamp(1.2rem,2.3vw,3rem)] font-semibold">جدول الترتيب</h2>

      <div className="h-[72vh] overflow-auto rounded-2xl border border-white/10 bg-black/25">
        <table className="min-w-full text-right text-[clamp(0.82rem,1.05vw,1.3rem)]">
          <thead className="sticky top-0 bg-[#10213a] text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-3">المركز</th>
              <th className="px-4 py-3">الفريق</th>
              <th className="px-4 py-3">لعب</th>
              <th className="px-4 py-3">ف</th>
              <th className="px-4 py-3">ت</th>
              <th className="px-4 py-3">خ</th>
              <th className="px-4 py-3">له</th>
              <th className="px-4 py-3">عليه</th>
              <th className="px-4 py-3">الفارق</th>
              <th className="px-4 py-3">النقاط</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length ? (
              sorted.map((row, index) => {
                const team = teamById.get(row.teamId)
                const rank = index + 1
                const isTop = rank <= 3
                return (
                  <tr key={row.teamId || index} className={['border-t border-white/10', isTop ? 'bg-[var(--primary-color)]/8' : ''].join(' ')}>
                    <td className="px-4 py-3 font-semibold">{formatArabicNumber(rank)}</td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <LogoThumb src={team?.logo} />
                        <span className="truncate">{team?.teamName || '--'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatArabicNumber(row.played ?? 0)}</td>
                    <td className="px-4 py-3">{formatArabicNumber(row.wins ?? 0)}</td>
                    <td className="px-4 py-3">{formatArabicNumber(row.draws ?? 0)}</td>
                    <td className="px-4 py-3">{formatArabicNumber(row.losses ?? 0)}</td>
                    <td className="px-4 py-3">{formatArabicNumber(row.gf ?? 0)}</td>
                    <td className="px-4 py-3">{formatArabicNumber(row.ga ?? 0)}</td>
                    <td className="px-4 py-3">{formatArabicNumber(row.gd ?? 0)}</td>
                    <td className="px-4 py-3 font-semibold text-[var(--secondary-color)]">{formatArabicNumber(row.points ?? 0)}</td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td className="px-4 py-10 text-center text-[var(--text-secondary)]" colSpan={10}>
                  لا يوجد ترتيب بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LogoThumb({ src }) {
  return (
    <span className="grid h-10 w-10 flex-none place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      {src ? <img alt="" src={src} className="h-full w-full object-cover" /> : <span>⚽</span>}
    </span>
  )
}
