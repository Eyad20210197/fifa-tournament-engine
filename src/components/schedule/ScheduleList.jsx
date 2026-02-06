import { useMemo } from 'react'
import { useTournamentStore } from '../../store/tournamentStore'

export function ScheduleList() {
  const matches = useTournamentStore((s) => s.matches)
  const teams = useTournamentStore((s) => s.teams)
  const liveMatchId = useTournamentStore((s) => s.liveMatchState.matchId)
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])
  const nameById = useMemo(() => {
    const map = new Map(teams.map((t) => [t.id, t.teamName]))
    return (teamId) => (teamId ? map.get(teamId) ?? null : null)
  }, [teams])
  const sorted = useMemo(() => {
    const list = (matches ?? []).slice()
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.id).localeCompare(String(b.id)))
    return list
  }, [matches])

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur">
      <div className="text-sm text-white/60">الجدول</div>
      <div className="mt-2 text-3xl font-semibold">مباريات البطولة</div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        <table className="w-full text-right text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-4 py-3">المباراة</th>
              <th className="px-4 py-3">الحالة</th>
              <th className="px-4 py-3">النتيجة</th>
            </tr>
          </thead>
          <tbody>
            {sorted?.length ? (
              sorted.map((m) => (
                <tr
                  key={m.id}
                  className={[
                    'border-t border-white/5',
                    m.id === liveMatchId ? 'bg-[#c9a227]/10' : '',
                  ].join(' ')}
                >
                  <td className="px-4 py-3 text-white/90">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <LogoThumb src={m.homeTeamId ? teamById.get(m.homeTeamId)?.logo : null} />
                        <div className="min-w-0 truncate">{nameById(m.homeTeamId) || '—'}</div>
                      </div>
                      <div className="flex-none text-white/60">ضد</div>
                      <div className="flex min-w-0 items-center gap-2">
                        <LogoThumb src={m.awayTeamId ? teamById.get(m.awayTeamId)?.logo : null} />
                        <div className="min-w-0 truncate">{nameById(m.awayTeamId) || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/80">{statusArabic(m.status)}</td>
                  <td className="px-4 py-3 font-semibold text-[#f6d365]">
                    {m.homeScore ?? 0}:{m.awayScore ?? 0}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-white/60" colSpan={3}>
                  لا توجد مباريات بعد. سيتم إنشاؤها تلقائياً في مرحلة مولّد البطولة.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function statusArabic(status) {
  switch (status) {
    case 'pending':
      return 'لم تبدأ'
    case 'live':
      return 'مباشر'
    case 'finished':
      return 'انتهت'
    default:
      return '—'
  }
}

function LogoThumb({ src }) {
  return (
    <span className="grid h-7 w-7 flex-none place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
      {src ? <img alt="" src={src} className="h-full w-full object-cover" /> : null}
    </span>
  )
}
