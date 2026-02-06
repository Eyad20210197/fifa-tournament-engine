import { useMemo } from 'react'
import { useTournamentStore } from '../../store/tournamentStore'

export function StandingsTable() {
  const standings = useTournamentStore((s) => s.standings)
  const teams = useTournamentStore((s) => s.teams)
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])
  const nameById = useMemo(() => new Map(teams.map((t) => [t.id, t.teamName])), [teams])
  const sorted = useMemo(() => {
    const list = (standings ?? []).slice()
    list.sort((a, b) => {
      if ((b.points ?? 0) !== (a.points ?? 0)) return (b.points ?? 0) - (a.points ?? 0)
      if ((b.gd ?? 0) !== (a.gd ?? 0)) return (b.gd ?? 0) - (a.gd ?? 0)
      if ((b.gf ?? 0) !== (a.gf ?? 0)) return (b.gf ?? 0) - (a.gf ?? 0)
      const an = (a.teamId && nameById.get(a.teamId)) || ''
      const bn = (b.teamId && nameById.get(b.teamId)) || ''
      if (an && bn) {
        const c = an.localeCompare(bn, 'ar')
        if (c !== 0) return c
      }
      return String(a.teamId ?? '').localeCompare(String(b.teamId ?? ''))
    })
    return list.map((r, idx) => ({ ...r, rank: r.rank ?? idx + 1 }))
  }, [standings, nameById])

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur">
      <div className="text-sm text-white/60">الترتيب</div>
      <div className="mt-2 text-3xl font-semibold">جدول الترتيب</div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        <table className="w-full text-right text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">الفريق</th>
              <th className="px-4 py-3">لعب</th>
              <th className="px-4 py-3">ف</th>
              <th className="px-4 py-3">ت</th>
              <th className="px-4 py-3">خ</th>
              <th className="px-4 py-3">له</th>
              <th className="px-4 py-3">عليه</th>
              <th className="px-4 py-3">فارق</th>
              <th className="px-4 py-3">نقاط</th>
            </tr>
          </thead>
          <tbody>
            {sorted?.length ? (
              sorted.map((row, idx) => (
                <tr key={row.teamId ?? idx} className="border-t border-white/5">
                  <td className="px-4 py-3 text-white/70">{row.rank ?? idx + 1}</td>
                  <td className="px-4 py-3 text-white/90">
                    <div className="flex min-w-0 items-center gap-3">
                      <LogoThumb src={row.teamId ? teamById.get(row.teamId)?.logo : null} />
                      <div className="min-w-0 truncate">{(row.teamId && nameById.get(row.teamId)) || '—'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/80">{row.played ?? 0}</td>
                  <td className="px-4 py-3 text-white/80">{row.wins ?? 0}</td>
                  <td className="px-4 py-3 text-white/80">{row.draws ?? 0}</td>
                  <td className="px-4 py-3 text-white/80">{row.losses ?? 0}</td>
                  <td className="px-4 py-3 text-white/80">{row.gf ?? 0}</td>
                  <td className="px-4 py-3 text-white/80">{row.ga ?? 0}</td>
                  <td className="px-4 py-3 text-white/80">{row.gd ?? 0}</td>
                  <td className="px-4 py-3 font-semibold text-[#f6d365]">{row.points ?? 0}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-white/60" colSpan={10}>
                  لا يوجد ترتيب بعد. سيتم إنشاؤه تلقائياً في مرحلة توليد الدوري.
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
    <span className="grid h-9 w-9 flex-none place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      {src ? <img alt="" src={src} className="h-full w-full object-cover" /> : null}
    </span>
  )
}
